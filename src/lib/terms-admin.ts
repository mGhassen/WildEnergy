import type { AdminTermsData } from "@/lib/api/admin-terms";

export function termIsDeletable(
  term: Pick<AdminTermsData, "is_active" | "can_delete" | "acceptance_count">
) {
  if (term.is_active) return false;
  if (term.can_delete === false) return false;
  if (term.can_delete === true) return true;
  return (term.acceptance_count ?? 0) === 0;
}
