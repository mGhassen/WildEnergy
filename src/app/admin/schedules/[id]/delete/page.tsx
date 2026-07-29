"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useSchedule } from "@/hooks/useSchedules";
import { useDeleteScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminDeleteSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params.id);
  const closeHref = Number.isFinite(scheduleId)
    ? `/admin/schedules/${scheduleId}`
    : "/admin/schedules";
  const listHref = "/admin/schedules";
  const onCancel = useCloseHref(listHref);
  const { data: schedule, isLoading, error } = useSchedule(scheduleId);
  const deleteMutation = useDeleteScheduleWithCourses();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Schedule" closeHref={listHref}>
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

  return (
    <RouteDialog
      title="Delete Schedule"
      description={`Are you sure you want to delete the schedule for "${name}"? Related generated courses will also be deleted when allowed.`}
      closeHref={listHref}
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
              onSuccess: () => router.push(listHref),
            });
          }}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete Schedule"}
        </Button>
      </div>
    </RouteDialog>
  );
}
