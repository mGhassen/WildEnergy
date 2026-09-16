import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  assertSeatCapacity,
  attachMemberSeat,
  createInviteToken,
  ensureOwnerSeat,
  findMemberIdByEmail,
  inviteExpiresAt,
  INVITE_SELECT,
  memberHasConflictingAccess,
} from '@/lib/subscription-seats';

async function getMemberProfile(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, email')
    .eq('email', user.email)
    .single();
  if (!profile?.member_id) return null;
  return profile;
}

function extractSubscriptionId(request: NextRequest): number | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(\d+)\/invites/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

async function assertOwner(subscriptionId: number, memberId: string) {
  const { data: subscription } = await supabaseServer()
    .from('subscriptions')
    .select('id, member_id, plan:plans(max_seats, name)')
    .eq('id', subscriptionId)
    .single();

  if (!subscription) return { error: 'Subscription not found', status: 404 as const };

  const isOwner =
    subscription.member_id === memberId ||
    Boolean(
      (
        await supabaseServer()
          .from('subscription_seats')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .eq('member_id', memberId)
          .eq('role', 'owner')
          .eq('status', 'active')
          .maybeSingle()
      ).data
    );

  if (!isOwner) return { error: 'Only the plan owner can invite', status: 403 as const };
  return { subscription };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const profile = await getMemberProfile(token);
    if (!profile) return NextResponse.json({ error: 'Member access required' }, { status: 403 });

    const subscriptionId = extractSubscriptionId(request);
    if (!subscriptionId) return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });

    const ownerCheck = await assertOwner(subscriptionId, profile.member_id);
    if ('error' in ownerCheck && ownerCheck.error) {
      return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
    }
    const subscription = ownerCheck.subscription!;
    await ensureOwnerSeat(supabaseServer(), subscriptionId, subscription.member_id);

    const maxSeats = Number((subscription.plan as any)?.max_seats ?? 1);
    if (maxSeats <= 1) {
      return NextResponse.json({ error: 'This plan does not allow extra seats' }, { status: 400 });
    }

    const body = await request.json();
    const memberId = body.memberId || body.member_id;
    const email = body.email ? String(body.email).trim().toLowerCase() : '';

    if (memberId) {
      if (memberId === subscription.member_id) {
        return NextResponse.json({ error: 'Owner already has a seat' }, { status: 400 });
      }
      const capacityError = await assertSeatCapacity(supabaseServer(), subscriptionId, maxSeats);
      if (capacityError) return NextResponse.json({ error: capacityError }, { status: 400 });
      if (await memberHasConflictingAccess(supabaseServer(), memberId, subscriptionId)) {
        return NextResponse.json(
          { error: 'Member already has another active subscription or seat' },
          { status: 400 }
        );
      }
      const result = await attachMemberSeat(supabaseServer(), {
        subscriptionId,
        memberId,
        invitedByMemberId: profile.member_id,
      });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, attached: true, seat: result.seat });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'memberId or email is required' }, { status: 400 });
    }

    const existingMemberId = await findMemberIdByEmail(supabaseServer(), email);
    if (existingMemberId) {
      if (existingMemberId === subscription.member_id) {
        return NextResponse.json({ error: 'Owner already has a seat' }, { status: 400 });
      }
      const capacityError = await assertSeatCapacity(supabaseServer(), subscriptionId, maxSeats);
      if (capacityError) return NextResponse.json({ error: capacityError }, { status: 400 });
      if (await memberHasConflictingAccess(supabaseServer(), existingMemberId, subscriptionId)) {
        return NextResponse.json(
          { error: 'Member already has another active subscription or seat' },
          { status: 400 }
        );
      }
      const result = await attachMemberSeat(supabaseServer(), {
        subscriptionId,
        memberId: existingMemberId,
        invitedByMemberId: profile.member_id,
      });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, attached: true, seat: result.seat });
    }

    const capacityError = await assertSeatCapacity(supabaseServer(), subscriptionId, maxSeats);
    if (capacityError) return NextResponse.json({ error: capacityError }, { status: 400 });

    const inviteToken = createInviteToken();
    const { data: invite, error: inviteError } = await supabaseServer()
      .from('subscription_invites')
      .insert({
        subscription_id: subscriptionId,
        email,
        token: inviteToken,
        invited_by_member_id: profile.member_id,
        status: 'pending',
        expires_at: inviteExpiresAt(14),
      })
      .select(INVITE_SELECT)
      .single();

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/auth/accept-plan-invite?token=${inviteToken}`;
    const planName = (subscription.plan as any)?.name || 'group plan';

    const { error: authInviteError } = await supabaseServer().auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { plan_invite_token: inviteToken, plan_name: planName },
    });
    if (authInviteError) {
      console.warn('inviteUserByEmail:', authInviteError.message);
    }

    return NextResponse.json({
      success: true,
      attached: false,
      invite,
      acceptUrl: redirectTo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
