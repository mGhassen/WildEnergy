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
  /** Path to navigate to when the dialog closes */
  closeHref: string;
  className?: string;
};

/**
 * Dialog driven by a real route. The page mounts with the dialog open;
 * closing navigates to `closeHref` (no query-param scheme).
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
      if (!open) router.push(closeHref);
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

export function useCloseHref(closeHref: string) {
  const router = useRouter();
  return useCallback(() => router.push(closeHref), [closeHref, router]);
}
