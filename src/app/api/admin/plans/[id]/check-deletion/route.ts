import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

type SubRow = { id: number; member_id: string | null; status: string | null };

function pickProfile(m: { profiles?: unknown; accounts?: unknown }) {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  const a = Array.isArray(m.accounts) ? m.accounts[0] : m.accounts;
  const prof = p as { first_name?: string; last_name?: string } | null | undefined;
  const acc = a as { email?: string } | null | undefined;
  return {
    first_name: prof?.first_name,
    last_name: prof?.last_name,
    account_email: acc?.email,
  };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const planIdNum = Number.parseInt(String(id), 10);
    if (!Number.isFinite(planIdNum)) {
      return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: subRows, error: subError } = await supabase
      .from('subscriptions')
      .select('id, member_id, status')
      .eq('plan_id', planIdNum);

    if (subError) {
      console.error('check-deletion subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to check plan subscriptions', details: subError.message },
        { status: 500 }
      );
    }

    const subscriptions = (subRows ?? []) as SubRow[];
    const memberIds = [...new Set(subscriptions.map((s) => s.member_id).filter(Boolean))] as string[];

    let memberById: Record<string, ReturnType<typeof pickProfile>> = {};
    if (memberIds.length > 0) {
      const { data: members, error: memError } = await supabase
        .from('members')
        .select(
          `
          id,
          profiles:profile_id (first_name, last_name),
          accounts:account_id (email)
        `
        )
        .in('id', memberIds);

      if (memError) {
        console.error('check-deletion members:', memError);
      } else {
        memberById = Object.fromEntries(
          (members ?? []).map((m: { id: string } & Parameters<typeof pickProfile>[0]) => [
            m.id,
            pickProfile(m),
          ])
        );
      }
    }

    const enriched = subscriptions.map((s) => ({
      ...s,
      member: s.member_id ? memberById[s.member_id] ?? null : null,
    }));

    const activeSubscriptions = enriched.filter((sub) => sub.status === 'active');
    const canDelete = activeSubscriptions.length === 0;
    const subscriptionCount = enriched.length;

    return NextResponse.json({
      canDelete,
      linkedSubscriptions: activeSubscriptions,
      subscriptionCount,
      message: canDelete
        ? 'Plan can be deleted safely'
        : `This plan has ${activeSubscriptions.length} active subscription(s)`,
    });
  } catch (error) {
    console.error('check-deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
