import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SeatRole = 'owner' | 'member';
export type SeatStatus = 'active' | 'revoked';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

/** Companion course registration that shares a group-plan booking (no extra session). */
export const GROUP_SEAT_REGISTRATION_NOTE =
  'Group seat — shares the subscription session';

/** Set when a seat is revoked so the next assignment can restore the course row. */
export const GROUP_SEAT_REVOKED_NOTE = 'Seat revoked — session was shared';

/** Set on companions when the booking that consumed the session is cancelled. */
export const GROUP_BOOKING_CANCELLED_NOTE = 'Cancelled with group booking';

const GROUP_SEAT_COMPANION_NOTES = new Set([
  GROUP_SEAT_REGISTRATION_NOTE,
  GROUP_SEAT_REVOKED_NOTE,
  GROUP_BOOKING_CANCELLED_NOTE,
]);

export function isGroupSeatCompanionRegistration(notes: string | null | undefined): boolean {
  return GROUP_SEAT_COMPANION_NOTES.has(notes ?? '');
}

export async function resolveAccessibleSubscriptionId(
  supabase: SupabaseClient,
  memberId: string,
  opts?: { status?: string[]; courseDate?: string }
): Promise<number | null> {
  const statuses = opts?.status ?? ['active'];

  const { data: owned } = await supabase
    .from('subscriptions')
    .select('id, start_date, end_date')
    .eq('member_id', memberId)
    .in('status', statuses)
    .order('end_date', { ascending: false })
    .limit(5);

  const { data: seats } = await supabase
    .from('subscription_seats')
    .select('subscription_id')
    .eq('member_id', memberId)
    .eq('status', 'active');

  const seatedIds = (seats || []).map((s) => s.subscription_id).filter(Boolean);
  let seatedSubs: Array<{ id: number; start_date: string; end_date: string }> = [];
  if (seatedIds.length) {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, start_date, end_date')
      .in('id', seatedIds)
      .in('status', statuses)
      .order('end_date', { ascending: false });
    seatedSubs = data || [];
  }

  const candidates = [...(owned || []), ...seatedSubs].sort(
    (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
  );

  for (const sub of candidates) {
    if (opts?.courseDate) {
      const course = opts.courseDate.slice(0, 10);
      const start = String(sub.start_date).slice(0, 10);
      const end = String(sub.end_date).slice(0, 10);
      if (course < start || course > end) continue;
    }
    return sub.id;
  }
  return null;
}

export async function ensureOwnerSeat(
  supabase: SupabaseClient,
  subscriptionId: number,
  memberId: string
) {
  const { data: existing } = await supabase
    .from('subscription_seats')
    .select('id, status')
    .eq('subscription_id', subscriptionId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== 'active') {
      await supabase
        .from('subscription_seats')
        .update({ status: 'active', role: 'owner', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return;
  }

  await supabase.from('subscription_seats').insert({
    subscription_id: subscriptionId,
    member_id: memberId,
    role: 'owner',
    status: 'active',
  });
}

export async function getSubscriptionOccupancy(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<{ activeSeats: number; pendingInvites: number; used: number }> {
  const [{ count: activeSeats }, { count: pendingInvites }] = await Promise.all([
    supabase
      .from('subscription_seats')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'active'),
    supabase
      .from('subscription_invites')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending'),
  ]);

  const seats = activeSeats ?? 0;
  const invites = pendingInvites ?? 0;
  return { activeSeats: seats, pendingInvites: invites, used: seats + invites };
}

export async function assertSeatCapacity(
  supabase: SupabaseClient,
  subscriptionId: number,
  maxSeats: number,
  extra = 1
): Promise<string | null> {
  const { used } = await getSubscriptionOccupancy(supabase, subscriptionId);
  if (used + extra > maxSeats) {
    return `No seats left (${used}/${maxSeats})`;
  }
  return null;
}

export async function memberHasConflictingAccess(
  supabase: SupabaseClient,
  memberId: string,
  excludeSubscriptionId?: number
): Promise<boolean> {
  let ownedQuery = supabase
    .from('subscriptions')
    .select('id')
    .eq('member_id', memberId)
    .in('status', ['active', 'pending'])
    .limit(1);
  if (excludeSubscriptionId != null) {
    ownedQuery = ownedQuery.neq('id', excludeSubscriptionId);
  }
  const { data: owned } = await ownedQuery;
  if (owned?.length) return true;

  let seatQuery = supabase
    .from('subscription_seats')
    .select('id, subscription_id')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .limit(5);
  if (excludeSubscriptionId != null) {
    seatQuery = seatQuery.neq('subscription_id', excludeSubscriptionId);
  }
  const { data: seats } = await seatQuery;
  return Boolean(seats?.length);
}

export function createInviteToken(): string {
  return randomBytes(24).toString('hex');
}

export function inviteExpiresAt(days = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function findMemberIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();

  if (account?.id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('account_id', account.id)
      .maybeSingle();
    if (member?.id) return member.id;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_email', normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (member?.id) return member.id;
  }

  return null;
}

export async function attachMemberSeat(
  supabase: SupabaseClient,
  opts: {
    subscriptionId: number;
    memberId: string;
    invitedByMemberId?: string | null;
  }
): Promise<{ error?: string; seat?: any }> {
  const { data: existing } = await supabase
    .from('subscription_seats')
    .select('*')
    .eq('subscription_id', opts.subscriptionId)
    .eq('member_id', opts.memberId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') {
      return { error: 'Member already has a seat on this subscription' };
    }
    const { data: seat, error } = await supabase
      .from('subscription_seats')
      .update({
        status: 'active',
        role: existing.role === 'owner' ? 'owner' : 'member',
        invited_by_member_id: opts.invitedByMemberId ?? existing.invited_by_member_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return { error: error.message };
    await syncGroupSeatCourseRegistrations(supabase, opts.subscriptionId);
    return { seat };
  }

  const { data: seat, error } = await supabase
    .from('subscription_seats')
    .insert({
      subscription_id: opts.subscriptionId,
      member_id: opts.memberId,
      role: 'member',
      status: 'active',
      invited_by_member_id: opts.invitedByMemberId ?? null,
    })
    .select('*')
    .single();

  if (error) return { error: error.message };
  await syncGroupSeatCourseRegistrations(supabase, opts.subscriptionId);
  return { seat };
}

export async function syncGroupSeatCourseRegistrations(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<number> {
  const { data, error } = await supabase.rpc('sync_group_seat_course_registrations', {
    p_subscription_id: subscriptionId,
  });
  if (error) {
    console.error('sync_group_seat_course_registrations:', error.message);
    return 0;
  }
  const count = Number(data);
  return Number.isFinite(count) ? count : 0;
}

export async function syncGroupSeatsForSubscriptions(
  supabase: SupabaseClient,
  subscriptionIds: Array<number | null | undefined>
): Promise<number> {
  const unique = [...new Set(subscriptionIds.filter((id): id is number => typeof id === 'number'))];
  let inserted = 0;
  for (const id of unique) {
    inserted += await syncGroupSeatCourseRegistrations(supabase, id);
  }
  return inserted;
}

export async function dropGroupSeatCourseRegistrations(
  supabase: SupabaseClient,
  subscriptionId: number,
  memberId: string
): Promise<void> {
  const { error } = await supabase.rpc('drop_group_seat_course_registrations', {
    p_subscription_id: subscriptionId,
    p_member_id: memberId,
  });
  if (error) {
    console.error('drop_group_seat_course_registrations:', error.message);
  }
}

export const SEAT_MEMBER_SELECT = `
  id,
  subscription_id,
  member_id,
  role,
  status,
  invited_by_member_id,
  created_at,
  members:member_id(
    id,
    status,
    profiles:profile_id(
      first_name,
      last_name
    ),
    accounts:account_id(
      email
    )
  )
`;

export const INVITE_SELECT = `
  id,
  subscription_id,
  email,
  token,
  invited_by_member_id,
  status,
  expires_at,
  accepted_member_id,
  created_at
`;
