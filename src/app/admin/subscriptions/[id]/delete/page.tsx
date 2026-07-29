"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscription,
  useDeleteSubscription,
} from "@/hooks/useSubscriptions";

export default function AdminDeleteSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscription, isLoading, isError } =
    useSubscription(subscriptionId);
  const deleteSubscriptionMutation = useDeleteSubscription();

  const handleConfirm = () => {
    if (!subscription) return;
    deleteSubscriptionMutation.mutate(subscriptionId, {
      onSuccess: () => {
        router.replace("/admin/subscriptions");
      },
    });
  };

  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return (
      <RouteDialog
        title="Delete Subscription"
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
        title="Delete Subscription"
        description="Loading…"
        closeHref={closeHref}
      >
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (isError || !subscription) {
    return (
      <RouteDialog
        title="Delete Subscription"
        description="Subscription not found"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription may have been deleted or the link is invalid.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => router.replace("/admin/subscriptions")}>
            Back to subscriptions
          </Button>
        </DialogFooter>
      </RouteDialog>
    );
  }

  const member = (subscription as any).member;
  const memberName = member
    ? `${member.first_name || member.firstName || ""} ${member.last_name || member.lastName || ""}`.trim()
    : "this subscription";
  const planName = (subscription as any).plan?.name;

  return (
    <RouteDialog
      title="Delete Subscription"
      description="Are you sure you want to delete this subscription? This action cannot be undone."
      closeHref={closeHref}
    >
      <div className="py-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">{memberName || "Unknown member"}</p>
          {planName && (
            <p className="text-sm text-muted-foreground">Plan: {planName}</p>
          )}
          <p className="text-sm text-muted-foreground capitalize">
            Status: {subscription.status}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={deleteSubscriptionMutation.isPending}
        >
          {deleteSubscriptionMutation.isPending
            ? "Deleting..."
            : "Delete Subscription"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
