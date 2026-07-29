"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useTrainer, useUpdateTrainer } from "@/hooks/useTrainers";
import { FormSkeleton } from "@/components/skeletons";
import {
  TrainerForm,
  trainerFormDefaultValues,
  trainerFormSchema,
  trainerToFormValues,
  toUpdateTrainerPayload,
  type TrainerFormData,
} from "../../trainer-form";

export default function AdminEditTrainerPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = String(params.id);
  const closeHref = `/admin/trainers/${trainerId}`;
  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const updateTrainerMutation = useUpdateTrainer();

  const form = useForm<TrainerFormData>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: trainerFormDefaultValues,
  });

  useEffect(() => {
    if (!trainer) return;
    form.reset(trainerToFormValues(trainer));
  }, [trainer, form]);

  const handleSubmit = (data: TrainerFormData) => {
    if (!trainer) return;
    updateTrainerMutation.mutate(
      toUpdateTrainerPayload(data, {
        id: trainer.id,
        account_id: trainer.account_id || "",
      }),
      { onSuccess: () => router.replace(closeHref) },
    );
  };

  if (isLoading) {
    return (
      <RouteDialog title="Edit Trainer" closeHref={closeHref}>
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  if (error || !trainer) {
    return (
      <RouteDialog title="Edit Trainer" closeHref="/admin/trainers">
        <p className="text-sm text-muted-foreground">Trainer not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Trainer"
      description="Update trainer information"
      closeHref={closeHref}
    >
      <TrainerForm
        form={form}
        onSubmit={handleSubmit}
        submitLabel="Update Trainer"
        isSubmitting={updateTrainerMutation.isPending}
      />
    </RouteDialog>
  );
}
