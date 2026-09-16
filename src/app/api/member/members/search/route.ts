import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getMemberProfile(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id')
    .eq('email', user.email)
    .single();
  if (!profile?.member_id) return null;
  return profile;
}

/** Lightweight member search for group-plan owners inviting seats. */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const profile = await getMemberProfile(token);
    if (!profile) return NextResponse.json({ error: 'Member access required' }, { status: 403 });

    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const { data: members, error } = await supabaseServer()
      .from('members')
      .select(`
        id,
        status,
        profiles:profile_id(first_name, last_name),
        accounts:account_id(email)
      `)
      .eq('status', 'active')
      .neq('id', profile.member_id)
      .limit(40);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const needle = q.toLowerCase();
    const filtered = (members || [])
      .map((m: any) => ({
        id: m.id,
        firstName: m.profiles?.first_name || '',
        lastName: m.profiles?.last_name || '',
        email: m.accounts?.email || '',
      }))
      .filter((m) => {
        const hay = `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 15);

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
