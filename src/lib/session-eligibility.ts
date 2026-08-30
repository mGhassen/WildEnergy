/**
 * Whether a subscription can cover a specific session group (dedicated or pool).
 * Prefer this over category matching when the course class resolves to a group.
 */
export function subscriptionCoversGroup(
  subscription: {
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
  },
  groupId: number,
): boolean {
  const hasDedicated = (subscription.subscription_group_sessions || []).some(
    (gs) => gs.group_id === groupId && gs.sessions_remaining > 0,
  );
  if (hasDedicated) return true;

  return (subscription.subscription_pool_sessions || []).some((ps) => {
    if (ps.sessions_remaining <= 0) return false;
    const planPool = Array.isArray(ps.plan_session_pools)
      ? ps.plan_session_pools[0]
      : ps.plan_session_pools;
    return (planPool?.plan_session_pool_groups || []).some(
      (g) => g.group_id === groupId,
    );
  });
}

/**
 * Whether a subscription can cover a course category via dedicated group
 * sessions or package session pools.
 */
export function subscriptionCoversCategory(
  subscription: {
    subscription_group_sessions?: Array<{
      group_id: number;
      sessions_remaining: number;
    }>;
    subscription_pool_sessions?: Array<{
      pool_id: number;
      sessions_remaining: number;
      plan_session_pools?: {
        plan_session_pool_groups?: Array<{
          group_id: number;
          groups?: {
            category_groups?: Array<{ categories?: { id: number } }>;
          };
        }>;
      };
    }>;
    plan?: {
      plan_groups?: Array<{
        group_id: number;
        groups?: {
          category_groups?: Array<{ categories?: { id: number } }>;
        };
      }>;
      plan_session_pools?: Array<{
        id: number;
        plan_session_pool_groups?: Array<{
          group_id: number;
          groups?: {
            category_groups?: Array<{ categories?: { id: number } }>;
          };
        }>;
      }>;
    };
  },
  categoryId: number
): boolean {
  const groupHasCategory = (
    categoryGroups: Array<{ categories?: { id: number } }> | undefined
  ) =>
    (categoryGroups || []).some((cg) => cg.categories?.id === categoryId);

  const groupSessions = subscription.subscription_group_sessions || [];
  const planGroups = subscription.plan?.plan_groups || [];

  for (const groupSession of groupSessions) {
    if (groupSession.sessions_remaining <= 0) continue;
    for (const planGroup of planGroups) {
      if (planGroup.group_id !== groupSession.group_id) continue;
      if (groupHasCategory(planGroup.groups?.category_groups)) {
        return true;
      }
    }
  }

  const poolSessions = subscription.subscription_pool_sessions || [];
  const planPools = subscription.plan?.plan_session_pools || [];

  for (const poolSession of poolSessions) {
    if (poolSession.sessions_remaining <= 0) continue;

    const planPool =
      planPools.find((p) => p.id === poolSession.pool_id) ||
      poolSession.plan_session_pools;

    const memberships =
      (planPool as any)?.plan_session_pool_groups ||
      [];

    for (const membership of memberships) {
      if (groupHasCategory(membership.groups?.category_groups)) {
        return true;
      }
    }
  }

  return false;
}

export function totalPlanSessionCount(plan: {
  plan_groups?: Array<{ session_count?: number }>;
  plan_session_pools?: Array<{ session_count?: number }>;
} | null | undefined): number {
  if (!plan) return 0;
  const dedicated =
    plan.plan_groups?.reduce((t, g) => t + (g.session_count ?? 0), 0) || 0;
  const pooled =
    plan.plan_session_pools?.reduce((t, p) => t + (p.session_count ?? 0), 0) ||
    0;
  return dedicated + pooled;
}

type PoolSessionRow = {
  pool_id?: number;
  sessions_remaining?: number;
  total_sessions?: number;
  plan_session_pools?: {
    id?: number;
    session_count?: number;
    is_free?: boolean;
    plan_session_pool_groups?: Array<{
      group_id: number;
      groups?: {
        id: number;
        name: string;
        description?: string;
        color?: string;
      } | null;
    }>;
  } | null;
};

/** Match subscription pool balance to a plan pool (handles stale pool_id after plan edits). */
export function findPoolSessionForPlan(
  poolSessions: PoolSessionRow[] | undefined,
  planPoolId: number,
  planPoolCount: number
): PoolSessionRow | undefined {
  const sessions = poolSessions || [];
  const direct = sessions.find((ps) => ps.pool_id === planPoolId);
  if (direct) return direct;
  if (planPoolCount === 1 && sessions.length === 1) {
    return sessions[0];
  }
  return undefined;
}

export function totalRemainingSessions(subscription: {
  subscription_group_sessions?: Array<{
    group_id?: number;
    sessions_remaining?: number;
  }>;
  subscription_pool_sessions?: Array<{
    pool_id?: number;
    sessions_remaining?: number;
  }>;
  plan?: {
    plan_groups?: Array<{ group_id?: number }> | null;
    plan_session_pools?: Array<{ id?: number }> | null;
  } | null;
}): number {
  const hasPlan = !!subscription.plan;
  const planGroupIds = new Set(
    (subscription.plan?.plan_groups || [])
      .map((g) => g.group_id)
      .filter((id): id is number => typeof id === "number"),
  );
  const planPoolIds = new Set(
    (subscription.plan?.plan_session_pools || [])
      .map((p) => p.id)
      .filter((id): id is number => typeof id === "number"),
  );

  const dedicated =
    subscription.subscription_group_sessions
      ?.filter((g) => {
        if (!hasPlan) return true;
        return g.group_id != null && planGroupIds.has(g.group_id);
      })
      .reduce((sum, g) => sum + (g.sessions_remaining || 0), 0) || 0;

  const pooled =
    subscription.subscription_pool_sessions
      ?.filter((p) => {
        if (!hasPlan) return true;
        if (p.pool_id != null && planPoolIds.has(p.pool_id)) return true;
        // Single-pool plan: balance row may still reference a replaced pool id
        const planPoolCount = subscription.plan?.plan_session_pools?.length ?? 0;
        return planPoolCount === 1;
      })
      .reduce((sum, p) => sum + (p.sessions_remaining || 0), 0) || 0;

  return dedicated + pooled;
}
