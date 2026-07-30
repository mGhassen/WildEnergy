/** Shared PostgREST select for plans including dedicated groups and shared pools */
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
  sessionCount: number;
  isFree?: boolean;
  groupIds: number[];
};

/**
 * Replace all shared session pools for a plan.
 * Caller should validate dedicated vs shared exclusivity (same group may be in multiple pools).
 */
export async function replacePlanSessionPools(
  supabase: {
    from: (table: string) => any;
  },
  planId: number,
  pools: PlanSessionPoolInput[] | undefined
): Promise<{ error: unknown }> {
  if (pools === undefined) {
    return { error: null };
  }

  const { error: deleteError } = await supabase
    .from('plan_session_pools')
    .delete()
    .eq('plan_id', planId);

  if (deleteError) {
    return { error: deleteError };
  }

  for (const pool of pools) {
    const groupIds = (pool.groupIds || []).filter((id) => id > 0);
    if (groupIds.length < 2) {
      return {
        error: new Error('Each shared pool must include at least 2 groups'),
      };
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
      return { error: poolError || new Error('Failed to create session pool') };
    }

    const memberships = groupIds.map((groupId) => ({
      pool_id: createdPool.id,
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
    const ids = (pool.groupIds || []).filter((id) => id > 0);
    if (ids.length < 2) {
      return 'Each shared pool must include at least 2 groups';
    }
    const seenInPool = new Set<number>();
    for (const id of ids) {
      if (seenInPool.has(id)) {
        return 'A group cannot appear twice in the same shared pool';
      }
      seenInPool.add(id);
      if (dedicatedIds.has(id)) {
        return 'A group cannot be both dedicated and in a shared pool';
      }
    }
  }

  return null;
}
