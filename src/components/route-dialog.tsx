"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RouteDialogProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** Destination when the dialog closes (list or detail — never another dialog). */
  closeHref: string;
  className?: string;
};

/**
 * Dialog driven by a real route.
 * Closing uses replace() so the dialog URL is dropped from history
 * (browser Back must not reopen the dialog).
 */
export function RouteDialog({
  children,
  title,
  description,
  closeHref,
  className,
}: RouteDialogProps) {
  const router = useRouter();

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) router.replace(closeHref);
    },
    [closeHref, router],
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className={className ?? "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Navigate to closeHref with replace (drops dialog from history). */
export function useCloseHref(closeHref: string) {
  const router = useRouter();
  return useCallback(() => router.replace(closeHref), [closeHref, router]);
}
