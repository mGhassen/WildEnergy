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

function groupsFromCategoryRows(rows: CategoryGroupRow[]): ClassGroupRef[] {
  const out: ClassGroupRef[] = [];
  for (const row of rows) {
    const raw = row.group ?? row.groups;
    const group = Array.isArray(raw) ? raw[0] : raw;
    if (!group?.id || !group.name) continue;
    out.push(group);
  }
  return out;
}

/**
 * Session group for a class via its category:
 * 1) Prefer category group whose name matches the class name (multi-group categories
 *    like Pole Dance — never steal another group's sessions via [0]).
 * 2) Else if the category has exactly one group, use it (e.g. Birthday & Events
 *    where class names differ from the sole group name).
 */
export function resolveGroupForClass(cls: {
  name?: string | null;
  category?: {
    category_groups?: CategoryGroupRow[] | null;
  } | null;
} | null | undefined): ClassGroupRef | null {
  const groups = groupsFromCategoryRows(cls?.category?.category_groups || []);
  if (groups.length === 0) return null;

  if (cls?.name) {
    const target = normalizeClassGroupName(cls.name);
    const matched = groups.find(
      (g) => normalizeClassGroupName(g.name) === target,
    );
    if (matched) return matched;
  }

  if (groups.length === 1) return groups[0];

  return null;
}

export function resolveGroupIdForClass(
  cls: Parameters<typeof resolveGroupForClass>[0],
): number | null {
  return resolveGroupForClass(cls)?.id ?? null;
}
