import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch stats
    const [{ count: totalUsers }, { count: totalMembers }, { count: totalTrainers }, { count: totalClasses }, { count: totalCheckins }, { data: payments }] = await Promise.all([
      supabaseServer().from('users').select('*', { count: 'exact', head: true }),
      supabaseServer().from('users').select('*', { count: 'exact', head: true }).eq('is_member', true),
      supabaseServer().from('users').select('*', { count: 'exact', head: true }).eq('is_trainer', true),
      supabaseServer().from('classes').select('*', { count: 'exact', head: true }),
      supabaseServer().from('checkins').select('*', { count: 'exact', head: true }),
      supabaseServer().from('payments').select('*'),
    ]);
    const totalPayments = payments?.length || 0;
    const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalMembers: totalMembers ?? 0,
      totalTrainers: totalTrainers ?? 0,
      totalClasses: totalClasses ?? 0,
      totalCheckins: totalCheckins ?? 0,
      totalPayments,
      totalRevenue,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
} 