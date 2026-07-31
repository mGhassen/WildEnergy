"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscriptions,
  useConsumeSession,
} from "@/hooks/useSubscriptions";

type Selection =
  | { type: "group"; id: number }
  | { type: "pool"; id: number }
  | null;

export default function AdminConsumeSessionPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscriptions, isLoading, isError } = useSubscriptions();
  const consumeSessionMutation = useConsumeSession();
  const [selection, setSelection] = useState<Selection>(null);

  const subscription = (subscriptions as any[] | undefined)?.find(
    (s) => s.id === subscriptionId,
  );
  const groupSessions = subscription?.subscription_group_sessions || [];
  const poolSessions = subscription?.subscription_pool_sessions || [];

  const handleConsume = () => {
    if (!selection) return;
    consumeSessionMutation.mutate(
      {
        subscriptionId,
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
        title="Consume Session"
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
        title="Consume Session"
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
        title="Consume Session"
        description="Subscription not found"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  const hasAny = groupSessions.length > 0 || poolSessions.length > 0;

  return (
    <RouteDialog
      title="Consume Session"
      description="Select a dedicated group or package pool to consume from"
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {hasAny ? (
          <div className="space-y-2">
            {groupSessions.map((groupSession: any) => {
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
                        {groupSession.sessions_remaining} sessions remaining
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

            {poolSessions.map((poolSession: any) => {
              const pool = poolSession.plan_session_pools;
              const memberships = pool?.plan_session_pool_groups || [];
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Package pool
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {memberships.map((m: any) => (
                          <span
                            key={m.group_id || m.groups?.id}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  m.groups?.color || "#6B7280",
                              }}
                            />
                            {m.groups?.name}
                          </span>
                        ))}
                        {memberships.length === 0 && (
                          <span className="font-medium text-sm">
                            Package sessions
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {poolSession.sessions_remaining} sessions remaining
                      </p>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
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
            No group or pool sessions available for this subscription
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          onClick={handleConsume}
          disabled={!selection || consumeSessionMutation.isPending}
        >
          {consumeSessionMutation.isPending
            ? "Consuming..."
            : "Consume Session"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
