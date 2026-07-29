"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscriptions,
  useManualRefundSessions,
} from "@/hooks/useSubscriptions";

type Selection =
  | { type: "group"; id: number }
  | { type: "pool"; id: number }
  | null;

export default function AdminRefundSessionPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscriptions, isLoading, isError } = useSubscriptions();
  const manualRefundMutation = useManualRefundSessions();
  const [selection, setSelection] = useState<Selection>(null);

  const subscription = (subscriptions as any[] | undefined)?.find(
    (s) => s.id === subscriptionId,
  );
  const groupSessions = subscription?.subscription_group_sessions || [];
  const poolSessions = subscription?.subscription_pool_sessions || [];

  const refundableGroups = groupSessions.filter(
    (gs: any) => gs.sessions_remaining < gs.total_sessions,
  );
  const refundablePools = poolSessions.filter(
    (ps: any) => ps.sessions_remaining < ps.total_sessions,
  );

  const handleRefund = () => {
    if (!selection) return;
    manualRefundMutation.mutate(
      {
        subscriptionId,
        sessionsToRefund: 1,
        groupId: selection.type === "group" ? selection.id : undefined,
        poolId: selection.type === "pool" ? selection.id : undefined,
      },
      {
        onSuccess: () => {
          router.replace(closeHref);
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

  const hasAny = refundableGroups.length > 0 || refundablePools.length > 0;

  return (
    <RouteDialog
      title="Refund Session"
      description="Select a dedicated group or shared pool to refund to"
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {hasAny ? (
          <div className="space-y-2">
            {refundableGroups.map((groupSession: any) => {
              const group = groupSession.group || groupSession.groups;
              const selected =
                selection?.type === "group" &&
                selection.id === groupSession.group_id;
              return (
                <div
                  key={`g-${groupSession.group_id}`}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setSelection({ type: "group", id: groupSession.group_id })
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
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: selected
                          ? "var(--primary)"
                          : "transparent",
                        borderColor: group?.color || "var(--border)",
                      }}
                    >
                      {selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {refundablePools.map((poolSession: any) => {
              const pool = poolSession.plan_session_pools;
              const names = (pool?.plan_session_pool_groups || [])
                .map((m: any) => m.groups?.name)
                .filter(Boolean)
                .join(" / ");
              const selected =
                selection?.type === "pool" &&
                selection.id === poolSession.pool_id;
              return (
                <div
                  key={`p-${poolSession.pool_id}`}
                  className={`p-3 border border-dashed rounded-lg cursor-pointer transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setSelection({ type: "pool", id: poolSession.pool_id })
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Shared pool
                      </p>
                      <h4 className="font-medium">{names || "Shared sessions"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {poolSession.sessions_remaining} /{" "}
                        {poolSession.total_sessions} sessions
                      </p>
                      <p className="text-xs text-green-600">
                        Can refund{" "}
                        {poolSession.total_sessions -
                          poolSession.sessions_remaining}{" "}
                        more sessions
                      </p>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: selected
                          ? "var(--primary)"
                          : "transparent",
                        borderColor: "var(--border)",
                      }}
                    >
                      {selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Nothing available for refund. All balances are at maximum capacity.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          onClick={handleRefund}
          disabled={!selection || manualRefundMutation.isPending}
        >
          {manualRefundMutation.isPending ? "Refunding..." : "Refund Session"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
