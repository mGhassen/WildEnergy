"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useCreateTrainer } from "@/hooks/useTrainers";
import {
  TrainerForm,
  trainerFormDefaultValues,
  trainerFormSchema,
  toCreateTrainerPayload,
  type TrainerFormData,
} from "../trainer-form";

const CLOSE_HREF = "/admin/trainers";

export default function AdminNewTrainerPage() {
  const router = useRouter();
  const createTrainerMutation = useCreateTrainer();
  const form = useForm<TrainerFormData>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: trainerFormDefaultValues,
  });

  const handleSubmit = (data: TrainerFormData) => {
    createTrainerMutation.mutate(toCreateTrainerPayload(data), {
      onSuccess: (trainer: any) => {
        router.replace(
          trainer?.id ? `/admin/trainers/${trainer.id}` : CLOSE_HREF,
        );
      },
    });
  };

  return (
    <RouteDialog
      title="Add New Trainer"
      description="Add a new trainer to the gym"
      closeHref={CLOSE_HREF}
    >
      <TrainerForm
        form={form}
        onSubmit={handleSubmit}
        submitLabel="Create Trainer"
        isSubmitting={createTrainerMutation.isPending}
      />
    </RouteDialog>
  );
}
