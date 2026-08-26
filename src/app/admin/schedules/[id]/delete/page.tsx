"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useSchedule } from "@/hooks/useSchedules";
import { useDeleteScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { useCourses } from "@/hooks/useCourse";
import { useAdminRegistrations, useAdminCheckins } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  describeScheduleDeleteBlock,
  getScheduleDeleteBlock,
} from "@/lib/course-delete-cleanup";

export default function AdminDeleteSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params.id);
  const closeHref = Number.isFinite(scheduleId)
    ? `/admin/schedules/${scheduleId}`
    : "/admin/schedules";
  const listHref = "/admin/schedules";
  const onCancel = useCloseHref(closeHref);
  const { data: schedule, isLoading, error } = useSchedule(scheduleId);
  const deleteMutation = useDeleteScheduleWithCourses();
  const { data: courses = [] } = useCourses();
  const { data: registrations = [] } = useAdminRegistrations();
  const { data: checkins = [] } = useAdminCheckins();
  const [blockedOpen, setBlockedOpen] = useState(true);

  const scheduleCourses = useMemo(
    () => (courses as any[]).filter((c: any) => c.schedule_id === scheduleId),
    [courses, scheduleId],
  );

  const deleteBlock = useMemo(() => {
    const courseIds = scheduleCourses.map((c: any) => c.id);
    const scheduleRegs = (registrations as any[]).filter((r: any) =>
      courseIds.includes(r.course_id),
    );
    return getScheduleDeleteBlock({
      courseIds,
      registrations: scheduleRegs.map((r: any) => ({
        course_id: r.course_id,
        id: r.id,
        status: r.status,
      })),
      checkins: (checkins as any[]).map((ch: any) => ({
        registration_id: ch.registration_id ?? ch.registration?.id,
      })),
    });
  }, [scheduleCourses, registrations, checkins]);

  if (isLoading) {
    return (
      <RouteDialog title="Delete Schedule" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !schedule || Number.isNaN(scheduleId)) {
    return (
      <RouteDialog title="Delete Schedule" closeHref={listHref}>
        <p className="text-sm text-muted-foreground">Schedule not found.</p>
      </RouteDialog>
    );
  }

  const name =
    (schedule as any).class?.name ||
    (schedule as any).classes?.name ||
    "this schedule";

  if (deleteBlock) {
    return (
      <AlertDialog
        open={blockedOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedOpen(false);
            router.replace(closeHref);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete schedule</AlertDialogTitle>
            <AlertDialogDescription>
              {describeScheduleDeleteBlock(deleteBlock)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.replace(closeHref)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete Schedule"
      description={`Are you sure you want to delete the schedule for "${name}"? Related generated courses will also be deleted when allowed.`}
      closeHref={closeHref}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={deleteMutation.isPending}
          onClick={() => {
            deleteMutation.mutate(scheduleId, {
              onSuccess: () => router.replace(listHref),
            });
          }}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete Schedule"}
        </Button>
      </div>
    </RouteDialog>
  );
}
