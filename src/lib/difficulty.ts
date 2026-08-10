export const DIFFICULTY_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_OPTIONS)[number];

export function normalizeDifficulties(
  value: string | string[] | null | undefined,
): DifficultyLevel[] {
  if (!value) return ["beginner"];
  const arr = Array.isArray(value) ? value : [value];
  const filtered = arr.filter((d): d is DifficultyLevel =>
    (DIFFICULTY_OPTIONS as readonly string[]).includes(d),
  );
  return filtered.length > 0 ? filtered : ["beginner"];
}

export function formatDifficulties(
  value: string | string[] | null | undefined,
): string {
  return normalizeDifficulties(value).join(", ");
}
