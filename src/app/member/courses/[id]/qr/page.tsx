"use client";

import { useParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import QRGenerator from "@/components/qr-generator";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";

export default function MemberCourseQrPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const closeHref = `/member/courses/${params.id}`;
  const onClose = useCloseHref(closeHref);

  const { data: registrations, isLoading } = useMemberRegistrations();
  const registration = (registrations ?? []).find(
    (reg) => reg.course_id === courseId && reg.status === "registered",
  );

  if (isLoading) {
    return (
      <RouteDialog
        title="Your QR Code"
        closeHref={closeHref}
        className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        <FormSkeleton fields={2} />
      </RouteDialog>
    );
  }

  if (!registration?.qr_code) {
    return (
      <RouteDialog title="Your QR Code" closeHref={closeHref}>
        <p className="text-sm text-muted-foreground">
          No QR code available for this registration.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Your QR Code"
      description="Show this QR code to the trainer for check-in"
      closeHref={closeHref}
      className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto"
    >
      <div className="flex flex-col items-center space-y-4 sm:space-y-6">
        <div className="p-2 sm:p-3 bg-muted/30 rounded-lg border">
          <QRGenerator value={registration.qr_code} size={200} />
        </div>
        <div className="w-full text-center space-y-2">
          <p className="text-sm text-muted-foreground">QR Code Value:</p>
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs font-mono break-all text-foreground">
              {registration.qr_code}
            </p>
          </div>
        </div>
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </RouteDialog>
  );
}
