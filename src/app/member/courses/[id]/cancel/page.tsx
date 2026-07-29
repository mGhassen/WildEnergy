"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useMemberCourse } from "@/hooks/useMemberCourses";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useCancelRegistration } from "@/hooks/useRegistrations";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";

export default function MemberCourseCancelPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const closeHref = `/member/courses/${params.id}`;
  const onCancel = useCloseHref(closeHref);

  const { data: course, isLoading: courseLoading } = useMemberCourse(courseId);
  const { data: registrations, isLoading: regsLoading } =
    useMemberRegistrations();
  const cancelMutation = useCancelRegistration();

  const registration = (registrations ?? []).find(
    (reg) => reg.course_id === courseId && reg.status === "registered",
  );

  const courseDate = (course as any)?.course_date || (course as any)?.courseDate;
  const startTime = (course as any)?.start_time || (course as any)?.startTime;
  const isWithin24Hours = (() => {
    if (!courseDate || !startTime) return false;
    const courseDateTime = new Date(`${courseDate}T${startTime}`);
    const cutoffTime = new Date(courseDateTime.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    return now >= cutoffTime && now < courseDateTime;
  })();

  const description = isWithin24Hours
    ? "Cancelling within 24 hours will forfeit your session. Continue?"
    : "Are you sure you want to cancel this class registration?";

  if (courseLoading || regsLoading) {
    return (
      <RouteDialog title="Cancel Registration" closeHref={closeHref}>
        <FormSkeleton fields={1} />
      </RouteDialog>
    );
  }

  if (!registration) {
    return (
      <RouteDialog title="Cancel Registration" closeHref={closeHref}>
        <p className="text-sm text-muted-foreground">
          No active registration found for this course.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Cancel Registration"
      description={description}
      closeHref={closeHref}
    >
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel}>
          Keep Registration
        </Button>
        <Button
          variant="destructive"
          disabled={cancelMutation.isPending}
          onClick={() => {
            cancelMutation.mutate(registration.id, {
              onSuccess: () => router.replace(closeHref),
            });
          }}
        >
          {cancelMutation.isPending
            ? "Cancelling..."
            : "Cancel Registration"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
