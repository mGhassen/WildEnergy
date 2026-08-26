/** Normalize for class↔group name match (DB has trailing spaces on some group names). */
export function normalizeClassGroupName(name: string | null | undefined): string {
  return (name || '').trim().toLowerCase();
}

export type ClassGroupRef = {
  id: number;
  name: string;
  color?: string | null;
};

type CategoryGroupRow = {
  group?: ClassGroupRef | ClassGroupRef[] | null;
  groups?: ClassGroupRef | ClassGroupRef[] | null;
};

/**
 * Session group for a class = the category_groups entry whose group name
 * matches the class name. No [0] fallback — shared categories (e.g. Pole Dance)
 * must not steal another group's sessions.
 */
export function resolveGroupForClass(cls: {
  name?: string | null;
  category?: {
    category_groups?: CategoryGroupRow[] | null;
  } | null;
} | null | undefined): ClassGroupRef | null {
  if (!cls?.name) return null;
  const target = normalizeClassGroupName(cls.name);
  const rows = cls.category?.category_groups || [];

  for (const row of rows) {
    const raw = row.group ?? row.groups;
    const group = Array.isArray(raw) ? raw[0] : raw;
    if (!group?.id || !group.name) continue;
    if (normalizeClassGroupName(group.name) === target) {
      return group;
    }
  }

  return null;
}

export function resolveGroupIdForClass(
  cls: Parameters<typeof resolveGroupForClass>[0],
): number | null {
  return resolveGroupForClass(cls)?.id ?? null;
}
