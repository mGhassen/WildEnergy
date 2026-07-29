"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Calendar, Clock, QrCode, Users } from "lucide-react";
import { RouteDialog } from "@/components/route-dialog";
import QRGenerator from "@/components/qr-generator";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { formatDate, formatTime } from "@/lib/date";
import { FormSkeleton } from "@/components/skeletons";

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}

function MemberRegistrationQrContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const registrationId = String(params.id);
  const closeHref = safeFrom(searchParams.get("from"), "/member/home");

  const { data: registrations, isLoading } = useMemberRegistrations();
  const registration = (registrations ?? []).find(
    (r) => String(r.id) === registrationId,
  );

  if (isLoading) {
    return (
      <RouteDialog
        title="Class QR Code"
        description="Show this code at the gym to check in"
        closeHref={closeHref}
        className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        <FormSkeleton fields={2} />
      </RouteDialog>
    );
  }

  if (!registration) {
    return (
      <RouteDialog title="Class QR Code" closeHref={closeHref}>
        <p className="text-sm text-muted-foreground">Registration not found.</p>
      </RouteDialog>
    );
  }

  const course = (registration as any).course;

  return (
    <RouteDialog
      title="Class QR Code"
      description="Show this code at the gym to check in"
      closeHref={closeHref}
      className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 sm:space-y-3">
          {course?.class?.category?.name && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full">
              <span className="text-primary font-semibold text-sm">
                {course.class.category.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {course?.class?.name && (
            <h4 className="text-base sm:text-lg font-semibold text-foreground">
              {course.class.name}
            </h4>
          )}
          <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            {course?.course_date && (
              <p className="flex items-center justify-center gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                {formatDate(course.course_date)}
              </p>
            )}
            {course?.start_time && (
              <p className="flex items-center justify-center gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                {formatTime(course.start_time)} -{" "}
                {formatTime(course.end_time || course.start_time)}
              </p>
            )}
            {(course?.trainer?.user?.first_name ||
              course?.trainer?.user?.last_name) && (
              <p className="flex items-center justify-center gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                {course.trainer?.user?.first_name}{" "}
                {course.trainer?.user?.last_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="p-2 sm:p-3 bg-white rounded-xl shadow-lg border-2 border-border">
            <QRGenerator value={registration.qr_code || ""} size={200} />
          </div>
          <div className="text-center space-y-2 w-full">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              QR Code
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded break-all">
              {registration.qr_code || "N/A"}
            </p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Present this QR code to the instructor when you arrive for your
            class
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <QrCode className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Scan at the gym entrance</span>
          </div>
        </div>
      </div>
    </RouteDialog>
  );
}

export default function MemberRegistrationQrPage() {
  return (
    <Suspense
      fallback={
        <RouteDialog title="Class QR Code" closeHref="/member/home">
          <FormSkeleton fields={2} />
        </RouteDialog>
      }
    >
      <MemberRegistrationQrContent />
    </Suspense>
  );
}
