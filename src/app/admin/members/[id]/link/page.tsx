"use client";

import { useParams, useRouter } from "next/navigation";
import { AccountLinkingDialog } from "@/components/account-linking-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminMemberLinkPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;

  if (isLoading) {
    return (
      <RouteDialog title="Link Account" closeHref={closeHref}>
        <FormSkeleton fields={3} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Link Account" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <AccountLinkingDialog
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref);
      }}
      memberId={memberId}
      memberName={`${member.firstName} ${member.lastName}`}
      onSuccess={() => router.replace(closeHref)}
    />
  );
}
