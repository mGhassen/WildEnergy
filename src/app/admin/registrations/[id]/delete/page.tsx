"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import {
  useRegistration,
  useDeleteRegistration,
} from "@/hooks/useRegistrations";

const CLOSE_HREF = "/admin/registrations";

export default function AdminDeleteRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const registrationId = Number(params.id);

  const { data: registration, isLoading, isError } =
    useRegistration(registrationId);
  const deleteRegistrationMutation = useDeleteRegistration();

  const label = registration
    ? `${(registration as any).member?.first_name ?? ""} ${(registration as any).member?.last_name ?? ""} · REG-${String(registration.id).padStart(5, "0")}`.trim()
    : "this registration";

  const handleConfirm = () => {
    deleteRegistrationMutation.mutate(registrationId, {
      onSuccess: () => router.replace(CLOSE_HREF),
    });
  };

  if (isLoading) {
    return (
      <RouteDialog title="Delete registration?" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (isError || !registration || Number.isNaN(registrationId)) {
    return (
      <RouteDialog title="Delete registration?" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground py-4">
          Registration not found.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete registration?"
      description={`This permanently removes ${label} from the course. This cannot be undone.`}
      closeHref={CLOSE_HREF}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={deleteRegistrationMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={deleteRegistrationMutation.isPending}
          onClick={handleConfirm}
        >
          {deleteRegistrationMutation.isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </RouteDialog>
  );
}
