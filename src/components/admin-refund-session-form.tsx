"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/skeletons";
import {
  useSubscriptions,
  useManualRefundSessions,
} from "@/hooks/useSubscriptions";
import { formatDate } from "@/lib/date";

type Selection =
  | { type: "group"; id: number }
  | { type: "pool"; id: number }
  | null;

function isRefundable(sub: any) {
  const groups = sub.subscription_group_sessions || [];
  const pools = sub.subscription_pool_sessions || [];
  return (
    groups.some((gs: any) => gs.sessions_remaining < gs.total_sessions) ||
    pools.some((ps: any) => ps.sessions_remaining < ps.total_sessions)
  );
}

function subscriptionLabel(sub: any) {
  const planName = sub.plan?.name || `Subscription #${sub.id}`;
  const period = `${formatDate(sub.start_date)} → ${formatDate(sub.end_date)}`;
  return `${planName} · ${sub.status} · ${period}`;
}

export function AdminRefundSessionForm({
  memberId,
  initialSubscriptionId,
  closeHref,
}: {
  memberId: string;
  initialSubscriptionId?: number;
  closeHref: string;
}) {
  const router = useRouter();
  const { data: subscriptions, isLoading, isError } = useSubscriptions();
  const manualRefundMutation = useManualRefundSessions();

  const memberSubs = useMemo(() => {
    if (!Array.isArray(subscriptions)) return [];
    return (subscriptions as any[])
      .filter((s) => s.member_id === memberId)
      .sort((a, b) => {
        const aActive = a.status === "active" ? 0 : 1;
        const bActive = b.status === "active" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return String(b.end_date).localeCompare(String(a.end_date));
      });
  }, [subscriptions, memberId]);

  const refundableSubs = useMemo(
    () => memberSubs.filter(isRefundable),
    [memberSubs],
  );

  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  useEffect(() => {
    if (subscriptionId != null || refundableSubs.length === 0) return;
    const preferred =
      (initialSubscriptionId &&
        refundableSubs.find((s) => s.id === initialSubscriptionId)) ||
      refundableSubs[0];
    setSubscriptionId(preferred.id);
  }, [refundableSubs, initialSubscriptionId, subscriptionId]);

  useEffect(() => {
    setSelection(null);
  }, [subscriptionId]);

  const subscription = memberSubs.find((s) => s.id === subscriptionId);
  const refundableGroups = (subscription?.subscription_group_sessions || []).filter(
    (gs: any) => gs.sessions_remaining < gs.total_sessions,
  );
  const refundablePools = (subscription?.subscription_pool_sessions || []).filter(
    (ps: any) => ps.sessions_remaining < ps.total_sessions,
  );
  const hasAny = refundableGroups.length > 0 || refundablePools.length > 0;

  const handleRefund = () => {
    if (!subscriptionId || !selection) return;
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

  if (isLoading) {
    return <FormSkeleton fields={2} showSubmit={false} />;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Failed to load subscriptions.
      </p>
    );
  }

  if (refundableSubs.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        Nothing available for refund. All balances are at maximum capacity.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Subscription</Label>
          <Select
            value={subscriptionId != null ? String(subscriptionId) : undefined}
            onValueChange={(v) => setSubscriptionId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subscription" />
            </SelectTrigger>
            <SelectContent>
              {refundableSubs.map((sub) => (
                <SelectItem key={sub.id} value={String(sub.id)}>
                  {subscriptionLabel(sub)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasAny ? (
          <div className="space-y-2">
            <Label>Refund into</Label>
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
            Selected subscription has no refundable balance.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => router.replace(closeHref)}>
          Cancel
        </Button>
        <Button
          onClick={handleRefund}
          disabled={!selection || manualRefundMutation.isPending}
        >
          {manualRefundMutation.isPending ? "Refunding..." : "Refund Session"}
        </Button>
      </DialogFooter>
    </>
  );
}
