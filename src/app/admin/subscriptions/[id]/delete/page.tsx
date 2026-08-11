"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscription,
  useSubscriptions,
  useDeleteSubscription,
} from "@/hooks/useSubscriptions";
import { usePayments } from "@/hooks/usePayments";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/config";

export default function AdminDeleteSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscriptionById, isLoading: isLoadingOne, isError } =
    useSubscription(subscriptionId);
  const { data: subscriptions = [], isLoading: isLoadingList } =
    useSubscriptions();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  const subscription =
    subscriptionById ??
    (Array.isArray(subscriptions)
      ? subscriptions.find((s: any) => Number(s.id) === subscriptionId)
      : undefined);
  const isLoading =
    ((isLoadingOne || isLoadingList) && !subscription) || isLoadingPayments;
  const deleteSubscriptionMutation = useDeleteSubscription();

  const linkedPayments = useMemo(
    () =>
      payments.filter(
        (payment) => Number(payment.subscription_id) === subscriptionId
      ),
    [payments, subscriptionId]
  );
  const cannotDelete = linkedPayments.length > 0;

  const handleConfirm = () => {
    if (!subscription || cannotDelete) return;
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

  if ((isError && !subscription) || !subscription) {
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
          <Button
            variant="outline"
            onClick={() => router.replace("/admin/subscriptions")}
          >
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
      title={cannotDelete ? "Cannot Delete Subscription" : "Delete Subscription"}
      description={
        cannotDelete
          ? "This subscription still has payments. Delete those payments first."
          : "Are you sure you want to delete this subscription? This action cannot be undone."
      }
      closeHref={closeHref}
    >
      <div className="py-4 space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">{memberName || "Unknown member"}</p>
          {planName && (
            <p className="text-sm text-muted-foreground">Plan: {planName}</p>
          )}
          <p className="text-sm text-muted-foreground capitalize">
            Status: {subscription.status}
          </p>
        </div>

        {cannotDelete && (
          <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold text-sm">
                    {linkedPayments.length} payment
                    {linkedPayments.length === 1 ? "" : "s"} must be deleted
                    first
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deleting payments restores credit wallet effects. Then you
                    can delete the subscription.
                  </p>
                </div>
                <ul className="space-y-2">
                  {linkedPayments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-background/80 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        #{payment.id} · {payment.payment_type} ·{" "}
                        {payment.payment_status}
                      </span>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.replace(`/admin/subscriptions/${subscriptionId}`)
                  }
                >
                  Open subscription
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={cannotDelete || deleteSubscriptionMutation.isPending}
        >
          {cannotDelete
            ? "Cannot Delete"
            : deleteSubscriptionMutation.isPending
              ? "Deleting..."
              : "Delete Subscription"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
