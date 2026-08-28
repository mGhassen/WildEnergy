"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminDeleteRegistration } from "@/hooks/useRegistrations";
import { useSubscriptions } from "@/hooks/useSubscriptions";
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

function subscriptionLabel(sub: any) {
  const planName = sub.plan?.name || `Subscription #${sub.id}`;
  return `${planName} · ${sub.status} · ${formatDate(sub.start_date)} → ${formatDate(sub.end_date)}`;
}

export default function AdminCourseDeleteRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = String(params.id);
  const closeHref = `/admin/courses/${courseId}`;
  const onCancel = useCloseHref(closeHref);
  const registrationId = Number(searchParams.get("registrationId"));
  const memberName = searchParams.get("memberName") || "this member";
  const memberId = searchParams.get("memberId") || "";
  const status = searchParams.get("status") || "";
  const isCancelled = status === "cancelled";
  const defaultSubIdRaw = searchParams.get("subscriptionId");
  const defaultSubId = defaultSubIdRaw ? Number(defaultSubIdRaw) : null;

  const deleteRegistrationMutation = useAdminDeleteRegistration();
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();

  const memberSubs = useMemo(() => {
    if (!memberId || !Array.isArray(subscriptions)) return [];
    return (subscriptions as any[])
      .filter((s) => String(s.member_id) === String(memberId))
      .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)));
  }, [subscriptions, memberId]);

  // Active: refund on. Cancelled wipe: refund off (already handled at cancel).
  const [refundSession, setRefundSession] = useState(!isCancelled);
  const [refundSubscriptionId, setRefundSubscriptionId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (refundSubscriptionId != null) return;
    if (defaultSubId && Number.isFinite(defaultSubId)) {
      setRefundSubscriptionId(defaultSubId);
      return;
    }
    if (memberSubs.length > 0) {
      setRefundSubscriptionId(memberSubs[0].id);
    }
  }, [defaultSubId, memberSubs, refundSubscriptionId]);

  return (
    <RouteDialog
      title="Delete Registration"
      description={
        isCancelled
          ? `Permanently delete ${memberName}'s cancelled registration (wipe history). Refund is off by default.`
          : `Permanently delete ${memberName}'s registration. Same refund options as cancel, but the row is removed.`
      }
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      {subsLoading ? (
        <FormSkeleton fields={2} showSubmit={false} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="refund-session"
              checked={refundSession}
              onCheckedChange={(checked) => setRefundSession(!!checked)}
            />
            <Label htmlFor="refund-session">Refund session</Label>
          </div>

          {refundSession && (
            <div className="space-y-2">
              <Label>Refund into subscription</Label>
              {memberSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscriptions found for this member. Uncheck refund to
                  delete without restoring a session.
                </p>
              ) : (
                <Select
                  value={
                    refundSubscriptionId != null
                      ? String(refundSubscriptionId)
                      : undefined
                  }
                  onValueChange={(v) => setRefundSubscriptionId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberSubs.map((sub) => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {subscriptionLabel(sub)}
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
              variant="destructive"
              disabled={
                !Number.isFinite(registrationId) ||
                deleteRegistrationMutation.isPending ||
                (refundSession && !refundSubscriptionId)
              }
              onClick={() => {
                deleteRegistrationMutation.mutate(
                  {
                    registrationId,
                    refundSession,
                    refundSubscriptionId:
                      refundSession && refundSubscriptionId
                        ? refundSubscriptionId
                        : undefined,
                  },
                  { onSuccess: () => router.replace(closeHref) },
                );
              }}
            >
              {deleteRegistrationMutation.isPending
                ? "Deleting..."
                : "Delete Registration"}
            </Button>
          </div>
        </div>
      )}
    </RouteDialog>
  );
}
