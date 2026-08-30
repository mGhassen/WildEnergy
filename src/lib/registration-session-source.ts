type RegistrationSessionInput = {
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
};

export type RegistrationSessionSourceDetails = {
  source: string | null;
  consumedGroupName: string | null;
  poolGroupNames: string[];
};

export function parseRegistrationSessionSource(
  reg: RegistrationSessionInput,
): RegistrationSessionSourceDetails {
  const source = reg.session_source ?? null;

  const rawGroup = reg.group || reg.groups;
  const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
  const consumedGroupName = group?.name || null;

  const rawPool = reg.pool || reg.plan_session_pools;
  const pool = Array.isArray(rawPool) ? rawPool[0] : rawPool;
  const poolGroupNames = (pool?.plan_session_pool_groups || [])
    .map((m) => m.groups?.name)
    .filter(Boolean) as string[];

  return { source, consumedGroupName, poolGroupNames };
}

/** Compact one-line label for inline lists. */
export function formatRegistrationSessionSource(
  reg: RegistrationSessionInput,
): string | null {
  const { source, consumedGroupName, poolGroupNames } =
    parseRegistrationSessionSource(reg);
  if (!source) return null;

  if (source === "dedicated") {
    return consumedGroupName ? `Dedicated · ${consumedGroupName}` : "Dedicated";
  }

  if (source === "pool") {
    if (poolGroupNames.length === 0) {
      return consumedGroupName ? `Pool · ${consumedGroupName}` : "Pool";
    }
    if (poolGroupNames.length <= 2) {
      return `Pool · ${poolGroupNames.join(", ")}`;
    }
    const primary = consumedGroupName || poolGroupNames[0];
    const extra = poolGroupNames.length - 1;
    return `Pool · ${primary} (+${extra})`;
  }

  return source;
}
