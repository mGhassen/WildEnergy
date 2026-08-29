/** Format how a registration consumed a subscription session. */
export function formatRegistrationSessionSource(reg: {
  session_source?: string | null;
  group?: { name?: string | null } | null | Array<{ name?: string | null }>;
  groups?: { name?: string | null } | null | Array<{ name?: string | null }>;
  pool?: {
    plan_session_pool_groups?: Array<{
      groups?: { name?: string | null } | null;
    }> | null;
  } | null | Array<{
    plan_session_pool_groups?: Array<{
      groups?: { name?: string | null } | null;
    }> | null;
  }>;
  plan_session_pools?: {
    plan_session_pool_groups?: Array<{
      groups?: { name?: string | null } | null;
    }> | null;
  } | null | Array<{
    plan_session_pool_groups?: Array<{
      groups?: { name?: string | null } | null;
    }> | null;
  }>;
}): string | null {
  const source = reg.session_source;
  if (!source) return null;

  const rawGroup = reg.group || reg.groups;
  const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
  const groupName = group?.name || null;

  const rawPool = reg.pool || reg.plan_session_pools;
  const pool = Array.isArray(rawPool) ? rawPool[0] : rawPool;
  const poolGroupNames = (pool?.plan_session_pool_groups || [])
    .map((m) => m.groups?.name)
    .filter(Boolean) as string[];

  if (source === "dedicated") {
    return groupName ? `Dedicated · ${groupName}` : "Dedicated";
  }

  if (source === "pool") {
    if (poolGroupNames.length > 0) {
      return `Pool · ${poolGroupNames.join(", ")}`;
    }
    return groupName ? `Pool · ${groupName}` : "Pool";
  }

  return source;
}
