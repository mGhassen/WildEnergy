"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import {
  usePlan,
  useCheckPlanDeletion,
  useDeletePlan,
} from "@/hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons";

export default function AdminDeletePlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);
  const closeHref =
    Number.isFinite(planId) && planId > 0
      ? `/admin/plans/${planId}`
      : "/admin/plans";
  const onCancel = useCloseHref(closeHref);

  const { data: plan, isLoading, error } = usePlan(planId);
  const checkDeletionMutation = useCheckPlanDeletion();
  const deletePlanMutation = useDeletePlan();
  const [linkedSubscriptions, setLinkedSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    if (!Number.isFinite(planId) || planId <= 0) return;
    checkDeletionMutation.mutate(planId, {
      onSuccess: (response) => {
        setLinkedSubscriptions(
          response.canDelete ? [] : response.linkedSubscriptions || [],
        );
      },
      onError: () => setLinkedSubscriptions([]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const confirmDelete = () => {
    deletePlanMutation.mutate(planId, {
      onSuccess: () => {
        router.push("/admin/plans");
      },
    });
  };

  if (!Number.isFinite(planId) || planId <= 0) {
    return (
      <RouteDialog
        title="Delete Plan"
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
        title="Delete Plan"
        description="Loading…"
        closeHref={closeHref}
      >
        <DashboardSkeleton />
      </RouteDialog>
    );
  }

  if (error || !plan) {
    return (
      <RouteDialog
        title="Delete Plan"
        description="Plan not found"
        closeHref="/admin/plans"
      >
        <p className="text-sm text-muted-foreground">
          This plan may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  const cannotDelete = linkedSubscriptions.length > 0;

  return (
    <RouteDialog
      title={cannotDelete ? "Cannot Delete Plan" : "Delete Plan"}
      description={
        cannotDelete
          ? `The plan "${plan.name}" cannot be deleted because it has active subscriptions.`
          : `Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`
      }
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      {cannotDelete && (
        <div className="mt-2 mb-4 p-5 bg-destructive/50 border-l-4 border-destructive rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground mb-2">
                Cannot Delete Plan
              </h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                This plan is currently being used by the following subscriptions
                and cannot be deleted:
              </p>
              <div className="space-y-2 mb-4">
                {linkedSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 p-2 bg-background/80 rounded-md border border-destructive/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {sub.member?.first_name} {sub.member?.last_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {sub.member?.account_email}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Cancel or transfer these subscriptions first
              </div>
            </div>
          </div>
        </div>
      )}

      {!cannotDelete && checkDeletionMutation.isPending && (
        <Alert className="mb-4">
          <AlertTitle>Checking subscriptions…</AlertTitle>
          <AlertDescription>
            Verifying whether this plan can be deleted.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={confirmDelete}
          disabled={
            cannotDelete ||
            deletePlanMutation.isPending ||
            checkDeletionMutation.isPending
          }
          className={`flex-1 ${
            cannotDelete
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {cannotDelete
            ? "Cannot Delete"
            : deletePlanMutation.isPending
              ? "Deleting..."
              : "Delete Plan"}
        </Button>
      </div>
    </RouteDialog>
  );
}
