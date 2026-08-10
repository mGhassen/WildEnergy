"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useTrainer, useDeleteTrainer } from "@/hooks/useTrainers";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";

export default function AdminTrainerDeletePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const trainerId = String(params.id);
  const closeHref = `/admin/trainers/${trainerId}`;
  const onCancel = useCloseHref(closeHref);
  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const deleteTrainerMutation = useDeleteTrainer();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Trainer" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !trainer) {
    return (
      <RouteDialog title="Delete Trainer" closeHref="/admin/trainers">
        <p className="text-sm text-muted-foreground">Trainer not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete Trainer"
      description={`Remove the trainer role for ${trainer.first_name} ${trainer.last_name}? The person profile${trainer.member_id ? " and member role" : ""} will be kept.`}
      closeHref={closeHref}
    >
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={deleteTrainerMutation.isPending}
          onClick={() => {
            deleteTrainerMutation.mutate(trainer.id, {
              onSuccess: () => {
                toast({
                  title: "Trainer deleted",
                  description: `${trainer.first_name} ${trainer.last_name} trainer role removed.`,
                });
                router.replace("/admin/trainers");
              },
            });
          }}
        >
          {deleteTrainerMutation.isPending ? "Deleting..." : "Delete Trainer"}
        </Button>
      </div>
    </RouteDialog>
  );
}
