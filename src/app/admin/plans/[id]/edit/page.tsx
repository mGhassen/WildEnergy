"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { usePlan, useUpdatePlan } from "@/hooks/usePlans";
import { useGroups } from "@/hooks/useGroups";
import { planApi } from "@/lib/api/plans";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons";
import {
  PlanForm,
  planFormDefaultValues,
  planFormSchema,
  planToFormValues,
  toApiPlanPayload,
  type PlanFormData,
} from "../../plan-form";

export default function AdminEditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const planId = Number(params.id);
  const closeHref = Number.isFinite(planId) && planId > 0
    ? `/admin/plans/${planId}`
    : "/admin/plans";

  const { data: plan, isLoading, error } = usePlan(planId);
  const updatePlanMutation = useUpdatePlan();
  const { data: groups } = useGroups();
  const [subscriptionCount, setSubscriptionCount] = useState<number | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: planFormDefaultValues,
  });

  useEffect(() => {
    if (!plan) return;
    form.reset(planToFormValues(plan));
  }, [plan, form]);

  useEffect(() => {
    if (!planId || !Number.isFinite(planId)) return;
    let cancelled = false;
    setSubscriptionLoading(true);
    planApi
      .checkPlanDeletion(planId)
      .then((res) => {
        if (cancelled) return;
        setSubscriptionCount(
          res.subscriptionCount ?? res.linkedSubscriptions?.length ?? 0,
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setSubscriptionCount(null);
        toast({
          title: "Could not load subscription info",
          description:
            e instanceof Error ? e.message : "Try again or refresh the page.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, toast]);

  const handleSubmit = (data: PlanFormData) => {
    updatePlanMutation.mutate(
      { planId, data: toApiPlanPayload(data) },
      {
        onSuccess: () => {
          router.replace(`/admin/plans/${planId}`);
        },
      },
    );
  };

  if (!Number.isFinite(planId) || planId <= 0) {
    return (
      <RouteDialog
        title="Edit Plan"
        description="Invalid plan"
        closeHref="/admin/plans"
      >
        <p className="text-sm text-muted-foreground">
          This plan link is invalid.
        </p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog
        title="Edit Plan"
        description="Loading plan…"
        closeHref={closeHref}
      >
        <DashboardSkeleton />
      </RouteDialog>
    );
  }

  if (error || !plan) {
    return (
      <RouteDialog
        title="Edit Plan"
        description="Plan not found"
        closeHref="/admin/plans"
      >
        <p className="text-sm text-muted-foreground">
          This plan may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Plan"
      description="Update plan information"
      closeHref={closeHref}
      className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
    >
      {subscriptionLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          Checking linked subscriptions…
        </p>
      )}
      {!subscriptionLoading &&
        subscriptionCount !== null &&
        subscriptionCount > 0 && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50/80 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Subscribed members</AlertTitle>
            <AlertDescription>
              Editing this plan can impact existing subscriptions.{" "}
              {subscriptionCount === 1
                ? "One member already has a subscription on this plan."
                : `${subscriptionCount} subscriptions are linked to this plan.`}
            </AlertDescription>
          </Alert>
        )}
      <PlanForm
        form={form}
        groups={groups}
        onSubmit={handleSubmit}
        submitLabel="Update Plan"
        isSubmitting={updatePlanMutation.isPending}
      />
    </RouteDialog>
  );
}
