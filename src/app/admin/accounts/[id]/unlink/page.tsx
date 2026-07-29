"use client";

import { useParams, useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useUnlinkAccountTrainer } from "@/hooks/useAccounts";

export default function AdminAccountUnlinkPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const unlinkTrainerMutation = useUnlinkAccountTrainer();

  return (
    <ConfirmationDialog
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref);
      }}
      onConfirm={() => {
        unlinkTrainerMutation.mutate(accountId, {
          onSuccess: () => router.replace(closeHref),
        });
      }}
      title="Unlink Trainer"
      description="Are you sure you want to unlink this trainer from the account? This action cannot be undone."
      confirmText="Unlink"
      cancelText="Cancel"
      isPending={unlinkTrainerMutation.isPending}
      variant="destructive"
    />
  );
}
