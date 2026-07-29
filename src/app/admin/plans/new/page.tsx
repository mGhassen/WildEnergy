"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useCreatePlan } from "@/hooks/usePlans";
import { useGroups } from "@/hooks/useGroups";
import {
  PlanForm,
  planFormDefaultValues,
  planFormSchema,
  toApiPlanPayload,
  type PlanFormData,
} from "../plan-form";

export default function AdminNewPlanPage() {
  const router = useRouter();
  const createPlanMutation = useCreatePlan();
  const { data: groups } = useGroups();

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: planFormDefaultValues,
  });

  const handleSubmit = (data: PlanFormData) => {
    createPlanMutation.mutate(toApiPlanPayload(data), {
      onSuccess: (plan) => {
        router.push(plan?.id ? `/admin/plans/${plan.id}` : "/admin/plans");
      },
    });
  };

  return (
    <RouteDialog
      title="Add New Plan"
      description="Add a new membership plan"
      closeHref="/admin/plans"
      className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
    >
      <PlanForm
        form={form}
        groups={groups}
        onSubmit={handleSubmit}
        submitLabel="Create Plan"
        isSubmitting={createPlanMutation.isPending}
      />
    </RouteDialog>
  );
}
