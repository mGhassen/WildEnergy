"use client";

import { useParams, useRouter } from "next/navigation";
import { CreateAccountDialog } from "@/components/create-account-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminMemberCreateAccountPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;

  if (isLoading) {
    return (
      <RouteDialog title="Create Account" closeHref={closeHref}>
        <FormSkeleton fields={4} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Create Account" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <CreateAccountDialog
      isOpen
      onClose={() => router.push(closeHref)}
      memberId={memberId}
      memberName={`${member.firstName} ${member.lastName}`}
    />
  );
}
