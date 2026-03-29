/**
 * Course/schedule delete is allowed when no one is actively on the roster or has
 * attended (check-in). Cancelled / absent-only registration rows do not block.
 */
export const REGISTRATION_STATUSES_BLOCKING_DELETE = new Set([
  "registered",
  "attended",
]);

export function registrationStatusBlocksDelete(
  status: string | null | undefined
): boolean {
  return !!status && REGISTRATION_STATUSES_BLOCKING_DELETE.has(status);
}
