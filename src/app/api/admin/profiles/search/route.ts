import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer().auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', user.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { user };
}

/**
 * Search people (profiles) for role attachment.
 * Query params:
 *   q              - name / phone / profile_email
 *   excludeRole    - "trainer" | "member" → hide profiles that already have that role
 *   limit          - default 20
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const excludeRole = searchParams.get('excludeRole');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);

    if (q.length < 2) {
      return NextResponse.json({ profiles: [], total: 0, query: q });
    }

    const { data: profiles, error } = await supabaseServer()
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_email')
      .or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,profile_email.ilike.%${q}%`,
      )
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to search profiles' },
        { status: 500 },
      );
    }

    const profileIds = (profiles || []).map((p) => p.id);
    if (profileIds.length === 0) {
      return NextResponse.json({ profiles: [], total: 0, query: q });
    }

    const [{ data: members }, { data: trainers }, { data: accounts }] = await Promise.all([
      supabaseServer()
        .from('members')
        .select('id, profile_id, account_id, status')
        .in('profile_id', profileIds),
      supabaseServer()
        .from('trainers')
        .select('id, profile_id, account_id, status')
        .in('profile_id', profileIds),
      supabaseServer()
        .from('accounts')
        .select('id, profile_id, email, status')
        .in('profile_id', profileIds),
    ]);

    const memberByProfile = new Map((members || []).map((m) => [m.profile_id, m]));
    const trainerByProfile = new Map((trainers || []).map((t) => [t.profile_id, t]));
    const accountByProfile = new Map((accounts || []).map((a) => [a.profile_id, a]));

    let results = (profiles || []).map((p) => {
      const member = memberByProfile.get(p.id);
      const trainer = trainerByProfile.get(p.id);
      const account = accountByProfile.get(p.id);
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        profile_email: p.profile_email,
        member_id: member?.id ?? null,
        trainer_id: trainer?.id ?? null,
        account_id: account?.id ?? member?.account_id ?? trainer?.account_id ?? null,
        account_email: account?.email ?? null,
        has_member: !!member,
        has_trainer: !!trainer,
        has_account: !!account,
      };
    });

    if (excludeRole === 'trainer') {
      results = results.filter((p) => !p.has_trainer);
    } else if (excludeRole === 'member') {
      results = results.filter((p) => !p.has_member);
    }

    return NextResponse.json({
      profiles: results,
      total: results.length,
      query: q,
    });
  } catch (e: any) {
    console.error('Profile search error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
