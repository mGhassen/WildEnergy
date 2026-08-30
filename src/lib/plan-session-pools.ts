/** Shared PostgREST select for plans including dedicated groups and package pools */
export const PLAN_WITH_GROUPS_AND_POOLS_SELECT = `
  *,
  plan_groups (
    id,
    group_id,
    session_count,
    is_free,
    groups (
      id,
      name,
      description,
      color,
      category_groups (
        categories (
          id,
          name,
          description,
          color
        )
      )
    )
  ),
  plan_session_pools (
    id,
    session_count,
    is_free,
    plan_session_pool_groups (
      id,
      group_id,
      groups (
        id,
        name,
        description,
        color,
        category_groups (
          categories (
            id,
            name,
            description,
            color
          )
        )
      )
    )
  )
`;

export type PlanSessionPoolInput = {
  id?: number;
  sessionCount: number;
  isFree?: boolean;
  groupIds: number[];
};

export type SyncPlanSessionPoolsResult = {
  error: unknown;
  poolIds: number[];
  deletedPoolIds: number[];
  createdPoolIds: number[];
  membershipChanged: boolean;
  needsReconcile: boolean;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function normalizeGroupIds(groupIds: number[] | undefined): number[] {
  return (groupIds || []).filter((id) => id > 0);
}

function membershipKey(groupIds: number[]): string {
  return [...groupIds].sort((a, b) => a - b).join(',');
}

async function adjustSubscriptionPoolTotals(
  supabase: SupabaseLike,
  poolId: number,
  oldCount: number,
  newCount: number
): Promise<{ error: unknown }> {
  if (oldCount === newCount) {
    return { error: null };
  }

  const { data: rows, error: fetchError } = await supabase
    .from('subscription_pool_sessions')
    .select('id, sessions_remaining')
    .eq('pool_id', poolId);

  if (fetchError) {
    return { error: fetchError };
  }

  const delta = newCount - oldCount;

  for (const row of rows || []) {
    let sessionsRemaining = row.sessions_remaining + delta;
    if (delta < 0) {
      sessionsRemaining = Math.min(row.sessions_remaining, newCount);
    }
    sessionsRemaining = Math.max(0, Math.min(sessionsRemaining, newCount));

    const { error: updateError } = await supabase
      .from('subscription_pool_sessions')
      .update({
        total_sessions: newCount,
        sessions_remaining: sessionsRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      return { error: updateError };
    }
  }

  return { error: null };
}

/**
 * Upsert plan_session_pools rows by id. Deletes pools removed from the payload.
 * Clears plan_session_pool_groups for the plan — call applyPlanSessionPoolMemberships
 * after plan_groups are synced (avoids exclusivity trigger ordering issues).
 */
export async function syncPlanSessionPoolRows(
  supabase: SupabaseLike,
  planId: number,
  pools: PlanSessionPoolInput[] | undefined
): Promise<{
  error: unknown;
  poolIds: number[];
  deletedPoolIds: number[];
  createdPoolIds: number[];
  membershipChanged: boolean;
}> {
  const empty = {
    poolIds: [] as number[],
    deletedPoolIds: [] as number[],
    createdPoolIds: [] as number[],
    membershipChanged: false,
  };

  if (pools === undefined) {
    return { error: null, ...empty };
  }

  for (const pool of pools) {
    if (normalizeGroupIds(pool.groupIds).length < 1) {
      return {
        error: new Error('Each pool must include at least 1 group'),
        ...empty,
      };
    }
  }

  const { data: existingPools, error: fetchError } = await supabase
    .from('plan_session_pools')
    .select('id, session_count')
    .eq('plan_id', planId);

  if (fetchError) {
    return { error: fetchError, ...empty };
  }

  const existingById = new Map(
    (existingPools || []).map((pool: { id: number; session_count: number }) => [
      pool.id,
      pool,
    ])
  );
  const existingIds = new Set(existingById.keys());
  const payloadIds = new Set(
    pools.map((pool) => pool.id).filter((id): id is number => id != null && id > 0)
  );

  for (const poolId of payloadIds) {
    if (!existingIds.has(poolId)) {
      return {
        error: new Error(`Pool ${poolId} does not belong to plan ${planId}`),
        ...empty,
      };
    }
  }

  const { data: existingMemberships, error: membershipsError } = await supabase
    .from('plan_session_pool_groups')
    .select('pool_id, group_id')
    .eq('plan_id', planId);

  if (membershipsError) {
    return { error: membershipsError, ...empty };
  }

  const oldMembershipByPool = new Map<number, number[]>();
  for (const row of existingMemberships || []) {
    const list = oldMembershipByPool.get(row.pool_id) || [];
    list.push(row.group_id);
    oldMembershipByPool.set(row.pool_id, list);
  }

  const deletedPoolIds = [...existingIds].filter((id) => !payloadIds.has(id));
  if (deletedPoolIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('plan_session_pools')
      .delete()
      .in('id', deletedPoolIds);

    if (deleteError) {
      return { error: deleteError, ...empty };
    }
  }

  const poolIds: number[] = [];
  const createdPoolIds: number[] = [];

  for (const pool of pools) {
    const groupIds = normalizeGroupIds(pool.groupIds);

    if (pool.id && existingById.has(pool.id)) {
      const previous = existingById.get(pool.id)!;
      const { error: updateError } = await supabase
        .from('plan_session_pools')
        .update({
          session_count: pool.sessionCount,
          is_free: pool.isFree || false,
        })
        .eq('id', pool.id)
        .eq('plan_id', planId);

      if (updateError) {
        return { error: updateError, ...empty };
      }

      if (previous.session_count !== pool.sessionCount) {
        const { error: totalsError } = await adjustSubscriptionPoolTotals(
          supabase,
          pool.id,
          previous.session_count,
          pool.sessionCount
        );
        if (totalsError) {
          return { error: totalsError, ...empty };
        }
      }

      poolIds.push(pool.id);
      continue;
    }

    const { data: createdPool, error: poolError } = await supabase
      .from('plan_session_pools')
      .insert({
        plan_id: planId,
        session_count: pool.sessionCount,
        is_free: pool.isFree || false,
      })
      .select('id')
      .single();

    if (poolError || !createdPool) {
      return {
        error: poolError || new Error('Failed to create session pool'),
        ...empty,
      };
    }

    poolIds.push(createdPool.id);
    createdPoolIds.push(createdPool.id);
  }

  let membershipChanged = deletedPoolIds.length > 0 || createdPoolIds.length > 0;

  if (!membershipChanged) {
    for (let i = 0; i < pools.length; i++) {
      const poolId = poolIds[i];
      const newKey = membershipKey(normalizeGroupIds(pools[i].groupIds));
      const oldKey = membershipKey(oldMembershipByPool.get(poolId) || []);
      if (newKey !== oldKey) {
        membershipChanged = true;
        break;
      }
    }
  }

  const { data: remainingPools, error: remainingError } = await supabase
    .from('plan_session_pools')
    .select('id')
    .eq('plan_id', planId);

  if (remainingError) {
    return { error: remainingError, ...empty };
  }

  const remainingIds = (remainingPools || []).map((pool: { id: number }) => pool.id);
  if (remainingIds.length > 0) {
    const { error: clearError } = await supabase
      .from('plan_session_pool_groups')
      .delete()
      .in('pool_id', remainingIds);

    if (clearError) {
      return { error: clearError, ...empty };
    }
  }

  return {
    error: null,
    poolIds,
    deletedPoolIds,
    createdPoolIds,
    membershipChanged,
  };
}

/** Insert pool group memberships after plan_groups are in sync. */
export async function applyPlanSessionPoolMemberships(
  supabase: SupabaseLike,
  planId: number,
  pools: PlanSessionPoolInput[],
  poolIds: number[]
): Promise<{ error: unknown }> {
  for (let i = 0; i < pools.length; i++) {
    const groupIds = normalizeGroupIds(pools[i].groupIds);
    const poolId = poolIds[i];

    if (groupIds.length < 1) {
      return { error: new Error('Each pool must include at least 1 group') };
    }

    const memberships = groupIds.map((groupId) => ({
      pool_id: poolId,
      plan_id: planId,
      group_id: groupId,
    }));

    const { error: membersError } = await supabase
      .from('plan_session_pool_groups')
      .insert(memberships);

    if (membersError) {
      return { error: membersError };
    }
  }

  return { error: null };
}

/**
 * Preserve pool ids on plan edit. Reconcile only when pools are removed/added
 * or group membership changes (e.g. adding Yoga to a pool).
 */
export async function syncPlanSessionPools(
  supabase: SupabaseLike,
  planId: number,
  pools: PlanSessionPoolInput[] | undefined,
  options?: { skipMembershipInsert?: boolean }
): Promise<SyncPlanSessionPoolsResult> {
  const rowSync = await syncPlanSessionPoolRows(supabase, planId, pools);

  if (rowSync.error || pools === undefined) {
    return {
      error: rowSync.error,
      poolIds: rowSync.poolIds,
      deletedPoolIds: rowSync.deletedPoolIds,
      createdPoolIds: rowSync.createdPoolIds,
      membershipChanged: rowSync.membershipChanged,
      needsReconcile: false,
    };
  }

  if (options?.skipMembershipInsert) {
    return {
      error: null,
      poolIds: rowSync.poolIds,
      deletedPoolIds: rowSync.deletedPoolIds,
      createdPoolIds: rowSync.createdPoolIds,
      membershipChanged: rowSync.membershipChanged,
      needsReconcile:
        rowSync.deletedPoolIds.length > 0 ||
        rowSync.createdPoolIds.length > 0 ||
        rowSync.membershipChanged,
    };
  }

  const { error: membershipError } = await applyPlanSessionPoolMemberships(
    supabase,
    planId,
    pools,
    rowSync.poolIds
  );

  if (membershipError) {
    return {
      error: membershipError,
      poolIds: rowSync.poolIds,
      deletedPoolIds: rowSync.deletedPoolIds,
      createdPoolIds: rowSync.createdPoolIds,
      membershipChanged: rowSync.membershipChanged,
      needsReconcile: false,
    };
  }

  return {
    error: null,
    poolIds: rowSync.poolIds,
    deletedPoolIds: rowSync.deletedPoolIds,
    createdPoolIds: rowSync.createdPoolIds,
    membershipChanged: rowSync.membershipChanged,
    needsReconcile:
      rowSync.deletedPoolIds.length > 0 ||
      rowSync.createdPoolIds.length > 0 ||
      rowSync.membershipChanged,
  };
}

/**
 * Insert pools for a brand-new plan (no existing subscriptions).
 */
export async function replacePlanSessionPools(
  supabase: SupabaseLike,
  planId: number,
  pools: PlanSessionPoolInput[] | undefined
): Promise<{ error: unknown }> {
  const result = await syncPlanSessionPools(supabase, planId, pools ?? []);
  return { error: result.error };
}

export function validatePlanAllocations(
  planGroups: Array<{ groupId: number }> | undefined,
  pools: PlanSessionPoolInput[] | undefined
): string | null {
  const dedicatedIds = new Set<number>();

  for (const g of planGroups || []) {
    if (!g.groupId) continue;
    if (dedicatedIds.has(g.groupId)) {
      return 'A group cannot appear more than once in dedicated allocations';
    }
    dedicatedIds.add(g.groupId);
  }

  for (const pool of pools || []) {
    const ids = normalizeGroupIds(pool.groupIds);
    if (ids.length < 1) {
      return 'Each pool must include at least 1 group';
    }
    const seenInPool = new Set<number>();
    for (const id of ids) {
      if (seenInPool.has(id)) {
        return 'A group cannot appear twice in the same package pool';
      }
      seenInPool.add(id);
      if (dedicatedIds.has(id)) {
        return 'A group cannot be both dedicated and in a package pool';
      }
    }
  }

  return null;
}
