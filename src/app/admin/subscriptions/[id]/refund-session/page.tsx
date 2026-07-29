"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscription,
  useManualRefundSessions,
} from "@/hooks/useSubscriptions";

export default function AdminRefundSessionPage() {
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
  const manualRefundMutation = useManualRefundSessions();
  const [selectedRefundGroupId, setSelectedRefundGroupId] = useState<
    number | null
  >(null);

  const groupSessions =
    (subscription as any)?.subscription_group_sessions || [];
  const refundableGroups = groupSessions.filter(
    (gs: any) => gs.sessions_remaining < gs.total_sessions,
  );

  const handleRefund = () => {
    if (!selectedRefundGroupId) return;
    manualRefundMutation.mutate(
      {
        subscriptionId,
        sessionsToRefund: 1,
        groupId: selectedRefundGroupId,
      },
      {
        onSuccess: () => {
          router.push(closeHref);
        },
      },
    );
  };

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
      description="Select which group to refund a session to"
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {refundableGroups.length > 0 ? (
          <div className="space-y-2">
            {refundableGroups.map((groupSession: any) => {
              const group = groupSession.group || groupSession.groups;
              return (
                <div
                  key={groupSession.group_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRefundGroupId === groupSession.group_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setSelectedRefundGroupId(groupSession.group_id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{group?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {groupSession.sessions_remaining} /{" "}
                        {groupSession.total_sessions} sessions
                      </p>
                      <p className="text-xs text-green-600">
                        Can refund{" "}
                        {groupSession.total_sessions -
                          groupSession.sessions_remaining}{" "}
                        more sessions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          backgroundColor:
                            selectedRefundGroupId === groupSession.group_id
                              ? "var(--primary)"
                              : "transparent",
                          borderColor: group?.color || "var(--border)",
                        }}
                      >
                        {selectedRefundGroupId === groupSession.group_id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No groups available for refund. All groups are at maximum capacity.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          onClick={handleRefund}
          disabled={
            !selectedRefundGroupId || manualRefundMutation.isPending
          }
        >
          {manualRefundMutation.isPending ? "Refunding..." : "Refund Session"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
