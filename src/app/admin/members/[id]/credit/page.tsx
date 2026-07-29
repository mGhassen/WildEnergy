"use client";

import { useParams, useRouter } from "next/navigation";
import { ManageCreditDialog } from "@/components/manage-credit-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminMemberCreditPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;

  if (isLoading) {
    return (
      <RouteDialog title="Manage Credit" closeHref={closeHref}>
        <FormSkeleton fields={3} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Manage Credit" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <ManageCreditDialog
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref);
      }}
      memberId={memberId}
      memberName={`${member.firstName} ${member.lastName}`}
    />
  );
}
