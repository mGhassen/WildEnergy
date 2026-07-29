"use client";

import { useParams, useRouter } from "next/navigation";
import { UnlinkAccountDialog } from "@/components/unlink-account-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { useUnlinkAccountFromMember } from "@/hooks/useAccountLinking";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminMemberUnlinkPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;
  const unlinkAccountMutation = useUnlinkAccountFromMember();

  if (isLoading) {
    return (
      <RouteDialog title="Unlink Account" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Unlink Account" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <UnlinkAccountDialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref);
      }}
      onConfirm={async () => {
        if (!member.account_id) return;
        try {
          await unlinkAccountMutation.mutateAsync(member.account_id);
          router.push(closeHref);
        } catch {
          /* toast from hook */
        }
      }}
      memberName={`${member.firstName} ${member.lastName}`}
      isPending={unlinkAccountMutation.isPending}
    />
  );
}
