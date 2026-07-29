"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useTrainer, useUnlinkTrainerAccount } from "@/hooks/useTrainers";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminTrainerUnlinkPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = String(params.id);
  const closeHref = `/admin/trainers/${trainerId}`;
  const onCancel = useCloseHref(closeHref);
  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const unlinkAccountMutation = useUnlinkTrainerAccount();

  if (isLoading) {
    return (
      <RouteDialog title="Unlink Account" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !trainer) {
    return (
      <RouteDialog title="Unlink Account" closeHref="/admin/trainers">
        <p className="text-sm text-muted-foreground">Trainer not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Unlink Account"
      description={`Unlink the account from ${trainer.first_name} ${trainer.last_name}?`}
      closeHref={closeHref}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={unlinkAccountMutation.isPending}
          onClick={() => {
            unlinkAccountMutation.mutate(trainerId, {
              onSuccess: () => router.push(closeHref),
            });
          }}
        >
          {unlinkAccountMutation.isPending ? "Unlinking..." : "Unlink"}
        </Button>
      </div>
    </RouteDialog>
  );
}
