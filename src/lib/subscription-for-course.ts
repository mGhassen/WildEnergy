import { isSubscriptionValidOnDate } from '@/lib/date';

type GroupSession = {
  group_id: number;
  sessions_remaining: number;
  subscription_id?: number;
};

type PoolSession = {
  pool_id: number;
  sessions_remaining: number;
  group_ids?: number[];
  subscription_id?: number;
};

export type SubscriptionLike = {
  id: number;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  subscription_group_sessions?: Array<{
    group_id: number;
    sessions_remaining: number;
  }>;
  subscription_pool_sessions?: Array<{
    pool_id: number;
    sessions_remaining: number;
    plan_session_pools?:
      | {
          plan_session_pool_groups?: Array<{ group_id: number }>;
        }
      | Array<{
          plan_session_pool_groups?: Array<{ group_id: number }>;
        }>
      | null;
  }>;
};

/** Subs that covered `courseDate` (cancelled excluded; "active today" ignored). */
export function subscriptionsCoveringCourseDate<T extends SubscriptionLike>(
  subscriptions: T[] | null | undefined,
  courseDate: string | Date,
): T[] {
  return (subscriptions || []).filter(
    (s) =>
      s.status !== 'cancelled' &&
      isSubscriptionValidOnDate(s.start_date, s.end_date, courseDate),
  );
}

export function subscriptionHasRemainingForGroup(
  subscription: SubscriptionLike,
  courseGroupId: number,
): boolean {
  const hasGroup = (subscription.subscription_group_sessions || []).some(
    (gs) => gs.group_id === courseGroupId && gs.sessions_remaining > 0,
  );
  if (hasGroup) return true;

  return (subscription.subscription_pool_sessions || []).some((ps) => {
    if (ps.sessions_remaining <= 0) return false;
    const planPool = Array.isArray(ps.plan_session_pools)
      ? ps.plan_session_pools[0]
      : ps.plan_session_pools;
    const groupIds = (planPool?.plan_session_pool_groups || []).map(
      (g) => g.group_id,
    );
    return groupIds.includes(courseGroupId);
  });
}

/** Pick sub covering course date with remaining sessions for that group. */
export function pickSubscriptionForCourse(
  subscriptions: SubscriptionLike[] | null | undefined,
  courseDate: string | Date,
  courseGroupId: number | null | undefined,
  preferredGroupId?: number | null,
): SubscriptionLike | null {
  const covering = subscriptionsCoveringCourseDate(subscriptions, courseDate);
  if (covering.length === 0) return null;

  const groupId =
    preferredGroupId && preferredGroupId > 0 ? preferredGroupId : courseGroupId;

  if (groupId != null) {
    return (
      covering.find((s) => subscriptionHasRemainingForGroup(s, groupId)) ?? null
    );
  }

  return (
    covering.find(
      (s) =>
        (s.subscription_group_sessions || []).some(
          (g) => g.sessions_remaining > 0,
        ) ||
        (s.subscription_pool_sessions || []).some(
          (p) => p.sessions_remaining > 0,
        ),
    ) ?? null
  );
}

export function memberCoversCourseOnDate(
  member: {
    subscriptions?: SubscriptionLike[];
    groupSessions?: GroupSession[];
    poolSessions?: PoolSession[];
  },
  courseDate: string | Date,
  courseGroupId: number | null | undefined,
): boolean {
  if (courseGroupId == null) return false;

  const coveringIds = new Set(
    subscriptionsCoveringCourseDate(member.subscriptions, courseDate).map(
      (s) => s.id,
    ),
  );
  if (coveringIds.size === 0) return false;

  const hasGroup = (member.groupSessions || []).some(
    (gs) =>
      gs.group_id === courseGroupId &&
      gs.sessions_remaining > 0 &&
      coveringIds.has(gs.subscription_id as number),
  );
  if (hasGroup) return true;

  return (member.poolSessions || []).some(
    (ps) =>
      (ps.group_ids || []).includes(courseGroupId) &&
      ps.sessions_remaining > 0 &&
      coveringIds.has(ps.subscription_id as number),
  );
}
