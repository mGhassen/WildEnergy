import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  assertSeatCapacity,
  attachMemberSeat,
  ensureOwnerSeat,
  memberHasConflictingAccess,
  SEAT_MEMBER_SELECT,
} from '@/lib/subscription-seats';

async function requireAdmin(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals, member_id')
    .eq('email', user.email)
    .single();
  if (!profile?.is_admin || !profile?.accessible_portals?.includes('admin')) return null;
  return profile;
}

function extractSubscriptionId(request: NextRequest): number | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(\d+)\/seats/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const admin = await requireAdmin(token);
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const subscriptionId = extractSubscriptionId(request);
    if (!subscriptionId) return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });

    const { data, error } = await supabaseServer()
      .from('subscription_seats')
      .select(SEAT_MEMBER_SELECT)
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const admin = await requireAdmin(token);
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const subscriptionId = extractSubscriptionId(request);
    if (!subscriptionId) return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });

    const body = await request.json();
    const memberId = body.memberId || body.member_id;
    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const { data: subscription, error: subError } = await supabaseServer()
      .from('subscriptions')
      .select('id, member_id, plan:plans(max_seats)')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await ensureOwnerSeat(supabaseServer(), subscriptionId, subscription.member_id);

    const maxSeats = Number((subscription.plan as any)?.max_seats ?? 1);
    if (maxSeats <= 1) {
      return NextResponse.json({ error: 'This plan does not allow extra seats' }, { status: 400 });
    }

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
      invitedByMemberId: admin.member_id ?? null,
    });

    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, seat: result.seat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
