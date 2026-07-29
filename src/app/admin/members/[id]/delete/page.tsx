"use client";

import { useParams, useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { useDeleteMember } from "@/hooks/useMembers";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminMemberDeletePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  /** Prefer returning to list after delete; cancel goes back to detail. */
  const cancelHref = `/admin/members/${memberId}`;
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;
  const deleteMemberMutation = useDeleteMember();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Member" closeHref={cancelHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Delete Member" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <ConfirmationDialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(cancelHref);
      }}
      onConfirm={async () => {
        try {
          await deleteMemberMutation.mutateAsync(memberId);
          router.push("/admin/members");
        } catch {
          /* toast from hook */
        }
      }}
      title="Delete Member"
      description={`Are you sure you want to delete ${member.firstName} ${member.lastName}? This action cannot be undone and will permanently remove all member data.`}
      confirmText="Delete Member"
      cancelText="Cancel"
      variant="destructive"
      isPending={deleteMemberMutation.isPending}
    />
  );
}
