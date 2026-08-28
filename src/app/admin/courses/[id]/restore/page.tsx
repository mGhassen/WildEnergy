"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminRestoreRegistration } from "@/hooks/useRegistrations";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import {
  pickSubscriptionForCourse,
  usableSubscriptionsForCourse,
} from "@/lib/subscription-for-course";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/skeletons";
import { formatDate } from "@/lib/date";

function remainingForCourse(sub: any, courseGroupId: number | null) {
  if (courseGroupId == null) return null;

  const dedicated = (sub.subscription_group_sessions || []).find(
    (gs: any) => gs.group_id === courseGroupId,
  );
  if (dedicated) {
    return {
      kind: "dedicated" as const,
      remaining: dedicated.sessions_remaining ?? 0,
      total: dedicated.total_sessions ?? 0,
      name: dedicated.group?.name || "Group",
    };
  }

  const pool = (sub.subscription_pool_sessions || []).find((ps: any) => {
    if ((ps.sessions_remaining ?? 0) <= 0) return false;
    const planPool = Array.isArray(ps.plan_session_pools)
      ? ps.plan_session_pools[0]
      : ps.plan_session_pools;
    const groupIds = (planPool?.plan_session_pool_groups || []).map(
      (g: any) => g.group_id,
    );
    return groupIds.includes(courseGroupId);
  });
  if (pool) {
    return {
      kind: "pool" as const,
      remaining: pool.sessions_remaining ?? 0,
      total: pool.total_sessions ?? 0,
      name: "Pool",
    };
  }

  return null;
}

function subscriptionLabel(sub: any, courseGroupId: number | null) {
  const planName = sub.plan?.name || `Subscription #${sub.id}`;
  const balance = remainingForCourse(sub, courseGroupId);
  const balancePart = balance
    ? ` · ${balance.remaining}/${balance.total} ${balance.kind}`
    : "";
  return `${planName}${balancePart} · ${sub.status} · ${formatDate(sub.start_date)} → ${formatDate(sub.end_date)}`;
}

export default function AdminCourseRestoreRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = String(params.id);
  const closeHref = `/admin/courses/${courseId}`;
  const onCancel = useCloseHref(closeHref);
  const registrationId = Number(searchParams.get("registrationId"));
  const memberName = searchParams.get("memberName") || "this member";
  const memberId = searchParams.get("memberId") || "";
  const defaultSubIdRaw = searchParams.get("subscriptionId");
  const defaultSubId = defaultSubIdRaw ? Number(defaultSubIdRaw) : null;
  const courseDate = searchParams.get("courseDate") || "";
  const courseGroupIdRaw = searchParams.get("courseGroupId");
  const courseGroupId = courseGroupIdRaw ? Number(courseGroupIdRaw) : null;

  const restoreMutation = useAdminRestoreRegistration();
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();

  const memberSubs = useMemo(() => {
    if (!memberId || !Array.isArray(subscriptions)) return [];
    return (subscriptions as any[])
      .filter((s) => String(s.member_id) === String(memberId))
      .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)));
  }, [subscriptions, memberId]);

  const usableSubs = useMemo(() => {
    if (!courseDate || courseGroupId == null) return memberSubs;
    return usableSubscriptionsForCourse(memberSubs, courseDate, courseGroupId);
  }, [memberSubs, courseDate, courseGroupId]);

  const [consumeSession, setConsumeSession] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);

  useEffect(() => {
    if (subscriptionId != null) return;
    if (defaultSubId && Number.isFinite(defaultSubId)) {
      const inList = usableSubs.some((s) => s.id === defaultSubId)
        || memberSubs.some((s) => s.id === defaultSubId);
      if (inList) {
        setSubscriptionId(defaultSubId);
        return;
      }
    }
    const picked = pickSubscriptionForCourse(
      usableSubs.length > 0 ? usableSubs : memberSubs,
      courseDate || new Date(),
      courseGroupId,
    );
    if (picked) setSubscriptionId(picked.id);
    else if (usableSubs[0]) setSubscriptionId(usableSubs[0].id);
    else if (memberSubs[0]) setSubscriptionId(memberSubs[0].id);
  }, [
    defaultSubId,
    usableSubs,
    memberSubs,
    subscriptionId,
    courseDate,
    courseGroupId,
  ]);

  const selectOptions = consumeSession
    ? usableSubs.length > 0
      ? usableSubs
      : memberSubs
    : memberSubs;

  return (
    <RouteDialog
      title="Restore Registration"
      description={`Restore ${memberName}'s cancelled registration. Choose which subscription session to use.`}
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      {subsLoading ? (
        <FormSkeleton fields={2} showSubmit={false} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="consume-session"
              checked={consumeSession}
              onCheckedChange={(checked) => setConsumeSession(!!checked)}
            />
            <Label htmlFor="consume-session">Consume session</Label>
          </div>

          {consumeSession && (
            <div className="space-y-2">
              <Label>Use session from subscription</Label>
              {selectOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscriptions with remaining sessions for this course.
                  Uncheck consume to restore without deducting a session.
                </p>
              ) : (
                <Select
                  value={
                    subscriptionId != null ? String(subscriptionId) : undefined
                  }
                  onValueChange={(v) => setSubscriptionId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptions.map((sub) => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {subscriptionLabel(sub, courseGroupId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              disabled={
                !Number.isFinite(registrationId) ||
                restoreMutation.isPending ||
                (consumeSession && !subscriptionId)
              }
              onClick={() => {
                restoreMutation.mutate(
                  {
                    registrationId,
                    consumeSession,
                    subscriptionId:
                      consumeSession && subscriptionId
                        ? subscriptionId
                        : undefined,
                  },
                  { onSuccess: () => router.replace(closeHref) },
                );
              }}
            >
              {restoreMutation.isPending
                ? "Restoring..."
                : "Restore Registration"}
            </Button>
          </div>
        </div>
      )}
    </RouteDialog>
  );
}
