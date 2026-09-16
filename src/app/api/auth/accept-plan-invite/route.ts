import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  attachMemberSeat,
  ensureOwnerSeat,
  memberHasConflictingAccess,
} from '@/lib/subscription-seats';

/**
 * Accept a pending plan invite for the authenticated user.
 * Creates member record if missing, attaches seat, marks invite accepted.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const inviteToken = String(body.token || '').trim();
    if (!inviteToken) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabaseServer()
      .from('subscription_invites')
      .select('*')
      .eq('token', inviteToken)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 400 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      await supabaseServer()
        .from('subscription_invites')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invite.id);
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }

    const email = user.email.toLowerCase();
    if (invite.email.toLowerCase() !== email) {
      return NextResponse.json(
        { error: 'Signed-in email does not match the invite' },
        { status: 403 }
      );
    }

    // Ensure account + profile + member exist
    let { data: account } = await supabaseServer()
      .from('accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!account) {
      const { error: accountError } = await supabaseServer().from('accounts').insert({
        id: user.id,
        email,
        status: 'active',
        is_admin: false,
      });
      if (accountError) {
        return NextResponse.json({ error: accountError.message }, { status: 500 });
      }
      account = { id: user.id };
    }

    let { data: profile } = await supabaseServer()
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      const meta = user.user_metadata || {};
      const { error: profileError } = await supabaseServer().from('profiles').insert({
        id: user.id,
        first_name: meta.first_name || meta.firstName || null,
        last_name: meta.last_name || meta.lastName || null,
        profile_email: email,
      });
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      profile = { id: user.id };
    }

    let { data: member } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!member) {
      const { data: createdMember, error: memberError } = await supabaseServer()
        .from('members')
        .insert({
          account_id: user.id,
          profile_id: profile.id,
          status: 'active',
        })
        .select('id')
        .single();
      if (memberError || !createdMember) {
        return NextResponse.json(
          { error: memberError?.message || 'Failed to create member' },
          { status: 500 }
        );
      }
      member = createdMember;
    }

    const { data: subscription } = await supabaseServer()
      .from('subscriptions')
      .select('id, member_id, plan:plans(max_seats)')
      .eq('id', invite.subscription_id)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await ensureOwnerSeat(supabaseServer(), subscription.id, subscription.member_id);

    const maxSeats = Number((subscription.plan as any)?.max_seats ?? 1);
    const { count: activeSeats } = await supabaseServer()
      .from('subscription_seats')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscription.id)
      .eq('status', 'active');
    const { count: otherPending } = await supabaseServer()
      .from('subscription_invites')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscription.id)
      .eq('status', 'pending')
      .neq('id', invite.id);

    if ((activeSeats ?? 0) + (otherPending ?? 0) + 1 > maxSeats) {
      return NextResponse.json({ error: `No seats left (${activeSeats ?? 0}/${maxSeats})` }, { status: 400 });
    }

    if (await memberHasConflictingAccess(supabaseServer(), member.id, subscription.id)) {
      return NextResponse.json(
        { error: 'You already have another active subscription or seat' },
        { status: 400 }
      );
    }

    const result = await attachMemberSeat(supabaseServer(), {
      subscriptionId: subscription.id,
      memberId: member.id,
      invitedByMemberId: invite.invited_by_member_id,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    await supabaseServer()
      .from('subscription_invites')
      .update({
        status: 'accepted',
        accepted_member_id: member.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      seat: result.seat,
      memberId: member.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const { data: invite } = await supabaseServer()
      .from('subscription_invites')
      .select(`
        id,
        email,
        status,
        expires_at,
        subscription_id,
        subscriptions:subscription_id(
          id,
          plan:plans(name, max_seats)
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    return NextResponse.json(invite);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
