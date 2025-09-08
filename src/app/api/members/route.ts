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
    // Fetch all members with their subscription group sessions
    const { data: members, error } = await supabaseServer()
      .from('users')
      .select(`
        *,
        subscriptions(
          id,
          status,
          end_date,
          subscription_group_sessions(
            id,
            group_id,
            sessions_remaining,
            total_sessions,
            groups(
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('is_member', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
    
    const membersWithCredit = (members || []).map((u: any) => ({ 
      ...u, 
      credit: u.credit ?? 0,
      groupSessions: u.subscriptions?.[0]?.subscription_group_sessions || []
    }));
    
    return NextResponse.json(membersWithCredit);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 