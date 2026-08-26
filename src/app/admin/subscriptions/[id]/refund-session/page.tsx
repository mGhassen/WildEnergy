"use client";

import { useParams } from "next/navigation";
import { RouteDialog } from "@/components/route-dialog";
import { FormSkeleton } from "@/components/skeletons";
import { AdminRefundSessionForm } from "@/components/admin-refund-session-form";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export default function AdminRefundSessionPage() {
  const params = useParams();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";

  const { data: subscriptions, isLoading, isError } = useSubscriptions();
  const subscription = (subscriptions as any[] | undefined)?.find(
    (s) => s.id === subscriptionId,
  );

  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return (
      <RouteDialog
        title="Refund Session"
        description="Invalid subscription"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription link is invalid.
        </p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog
        title="Refund Session"
        description="Loading…"
        closeHref={closeHref}
        className="sm:max-w-md"
      >
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (isError || !subscription) {
    return (
      <RouteDialog
        title="Refund Session"
        description="Subscription not found"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Refund Session"
      description="Choose which subscription to credit, then a group or package pool"
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <AdminRefundSessionForm
        memberId={subscription.member_id}
        initialSubscriptionId={subscriptionId}
        closeHref={closeHref}
      />
    </RouteDialog>
  );
}
