"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Search-param keys reserved for dialog routing (stripped on close). */
export const DIALOG_PARAM_KEYS = [
  "dialog",
  "id",
  "paymentId",
  "courseId",
  "accountId",
  "registrationId",
  "memberId",
  "groupId",
] as const;

export type DialogExtraParams = Partial<
  Record<
    Exclude<(typeof DIALOG_PARAM_KEYS)[number], "dialog">,
    string | number | null | undefined
  >
>;

function buildSearchString(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
  keysToClear: readonly string[] = [],
): string {
  const next = new URLSearchParams(current.toString());
  for (const key of keysToClear) {
    next.delete(key);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Syncs Dialog/AlertDialog open state with URL search params.
 *
 * Scheme: `?dialog=create|edit|delete|payment|...&id=12&paymentId=9`
 * Unrelated params (e.g. `view=`) are preserved.
 */
export function useDialogParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dialog = searchParams.get("dialog");

  const dialogId = useMemo(() => {
    const raw = searchParams.get("id");
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }, [searchParams]);

  const getParam = useCallback(
    (key: Exclude<(typeof DIALOG_PARAM_KEYS)[number], "dialog">) =>
      searchParams.get(key),
    [searchParams],
  );

  const isOpen = useCallback(
    (name: string) => dialog === name,
    [dialog],
  );

  const openDialog = useCallback(
    (name: string, params?: DialogExtraParams) => {
      const updates: Record<string, string | null | undefined> = {
        dialog: name,
      };
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          updates[key] =
            value === null || value === undefined ? null : String(value);
        }
      }
      // Clear other dialog-only keys that were not provided, then set new ones
      const qs = buildSearchString(searchParams, updates, [
        ...DIALOG_PARAM_KEYS.filter((k) => k !== "dialog" && !(params && k in params)),
      ]);
      router.push(`${pathname}${qs}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeDialog = useCallback(() => {
    const qs = buildSearchString(searchParams, {}, DIALOG_PARAM_KEYS);
    router.push(`${pathname}${qs}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeDialog();
    },
    [closeDialog],
  );

  return {
    dialog,
    dialogId,
    isOpen,
    openDialog,
    closeDialog,
    onOpenChange,
    getParam,
    searchParams,
  };
}
