"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminCancelRegistration } from "@/hooks/useRegistrations";
import { Button } from "@/components/ui/button";

export default function AdminCourseCancelRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = String(params.id);
  const closeHref = `/admin/courses/${courseId}`;
  const onCancel = useCloseHref(closeHref);
  const registrationId = Number(searchParams.get("registrationId"));
  const memberName = searchParams.get("memberName") || "this member";
  const cancelRegistrationMutation = useAdminCancelRegistration();

  return (
    <RouteDialog
      title="Cancel Registration"
      description={`Are you sure you want to cancel the registration for ${memberName}? This will remove them from the course and refund their session if they have an active subscription.`}
      closeHref={closeHref}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={
            !Number.isFinite(registrationId) ||
            cancelRegistrationMutation.isPending
          }
          onClick={() => {
            cancelRegistrationMutation.mutate(
              { registrationId, refundSession: true },
              { onSuccess: () => router.replace(closeHref) },
            );
          }}
        >
          {cancelRegistrationMutation.isPending
            ? "Cancelling..."
            : "Cancel Registration"}
        </Button>
      </div>
    </RouteDialog>
  );
}
