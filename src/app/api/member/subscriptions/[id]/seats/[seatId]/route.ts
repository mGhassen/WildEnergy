import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { dropGroupSeatCourseRegistrations } from '@/lib/subscription-seats';

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

function extractIds(request: NextRequest): { subscriptionId: number; seatId: number } | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(\d+)\/seats\/(\d+)/);
  if (!match) return null;
  const subscriptionId = parseInt(match[1], 10);
  const seatId = parseInt(match[2], 10);
  if (!Number.isFinite(subscriptionId) || !Number.isFinite(seatId)) return null;
  return { subscriptionId, seatId };
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const profile = await getMemberProfile(token);
    if (!profile) return NextResponse.json({ error: 'Member access required' }, { status: 403 });

    const ids = extractIds(request);
    if (!ids) return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });

    const { data: subscription } = await supabaseServer()
      .from('subscriptions')
      .select('id, member_id')
      .eq('id', ids.subscriptionId)
      .single();

    if (!subscription || subscription.member_id !== profile.member_id) {
      return NextResponse.json({ error: 'Only the plan owner can revoke seats' }, { status: 403 });
    }

    const { data: seat } = await supabaseServer()
      .from('subscription_seats')
      .select('id, role, member_id')
      .eq('id', ids.seatId)
      .eq('subscription_id', ids.subscriptionId)
      .maybeSingle();

    if (!seat) return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
    if (seat.role === 'owner') {
      return NextResponse.json({ error: 'Cannot revoke the owner seat' }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('subscription_seats')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', ids.seatId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (seat.member_id) {
      await dropGroupSeatCourseRegistrations(
        supabaseServer(),
        ids.subscriptionId,
        seat.member_id,
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
