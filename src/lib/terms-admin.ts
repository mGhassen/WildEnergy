import type { AdminTermsData } from "@/lib/api/admin-terms";

/** DB: `terms_and_conditions.version` VARCHAR(20) */
export const TERMS_VERSION_MAX_LEN = 20;

/** New version string for a duplicate; always ≤ {@link TERMS_VERSION_MAX_LEN}. */
export function versionForDuplicate(sourceVersion: string): string {
  const id = Date.now().toString(36);
  const suffix = `-c${id}`;
  const maxHead = TERMS_VERSION_MAX_LEN - suffix.length;
  if (maxHead < 1) {
    return id.slice(0, TERMS_VERSION_MAX_LEN);
  }
  const head = sourceVersion.slice(0, maxHead);
  return `${head}${suffix}`;
}

export function termIsDeletable(
  term: Pick<AdminTermsData, "is_active" | "can_delete" | "acceptance_count">
) {
  if (term.is_active) return false;
  if (term.can_delete === false) return false;
  if (term.can_delete === true) return true;
  return (term.acceptance_count ?? 0) === 0;
}
