"use client";

import { useParams } from "next/navigation";
import { RouteDialog } from "@/components/route-dialog";
import { AdminRefundSessionForm } from "@/components/admin-refund-session-form";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminMemberRefundSessionPage() {
  const params = useParams();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;

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

  if (error || !member) {
    return (
      <RouteDialog
        title="Refund Session"
        description="Member not found"
        closeHref="/admin/members"
      >
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Refund Session"
      description={`Choose which of ${member.firstName}'s subscriptions to credit`}
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <AdminRefundSessionForm memberId={memberId} closeHref={closeHref} />
    </RouteDialog>
  );
}
