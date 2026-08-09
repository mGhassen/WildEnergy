export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function distanceThreshold(length: number): number {
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  return 3;
}

/** Case/accent-insensitive equality, substring, or close edit-distance. */
export function namesLookAlike(typed: string, candidate: string): boolean {
  const a = normalizeName(typed);
  const b = normalizeName(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshtein(a, b) <= distanceThreshold(Math.max(a.length, b.length));
}

export type NamedMember = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  is_blacklisted?: boolean;
};

export function findSimilarBlacklistedMembers<T extends NamedMember>(
  firstName: string,
  lastName: string,
  members: T[],
): T[] {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first || !last) return [];

  return members.filter(
    (member) =>
      member.is_blacklisted &&
      namesLookAlike(first, member.first_name || "") &&
      namesLookAlike(last, member.last_name || ""),
  );
}
