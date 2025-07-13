import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const memberId = params.id;
    // Get member info
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('*')
      .eq('id', memberId)
      .single();
    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    // Get subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', memberId);
    // Get plans
    const { data: plans } = await supabase
      .from('plans')
      .select('*');
    // Attach plan info to subscriptions
    const memberSubscriptions = (subscriptions || []).map((sub: any) => {
      const plan = (plans || []).find((p: any) => p.id === sub.plan_id);
      return {
        ...sub,
        startDate: sub.start_date,
        endDate: sub.end_date,
        sessionsRemaining: sub.sessions_remaining,
        plan: plan ? {
          ...plan,
          sessionsIncluded: plan.sessionsIncluded,
          price: plan.price,
        } : null,
      };
    });
    // Get class registrations
    const { data: registrations } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('user_id', memberId);
    // Get checkins
    const { data: checkins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', memberId);
    // Get payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', memberId);
    // Expose credit field
    return NextResponse.json({
      member: { ...member, credit: member.credit ?? 0 },
      subscriptions: memberSubscriptions,
      registrations: registrations || [],
      checkins: checkins || [],
      payments: payments || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 });
  }
} 