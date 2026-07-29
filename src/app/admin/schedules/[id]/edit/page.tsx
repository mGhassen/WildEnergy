"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { RouteDialog } from "@/components/route-dialog";
import { useSchedule } from "@/hooks/useSchedules";
import { useUpdateScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { useAdminClasses } from "@/hooks/useAdmin";
import { useTrainers } from "@/hooks/useTrainers";
import { FormSkeleton } from "@/components/skeletons";
import {
  ScheduleForm,
  scheduleFormDefaultValues,
  mapScheduleToApi,
  scheduleToFormValues,
  type ScheduleFormData,
} from "../../schedule-form";

export default function AdminEditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = Number(params.id);
  const closeHref = `/admin/schedules/${scheduleId}`;
  const { data: schedule, isLoading, error } = useSchedule(scheduleId);
  const updateMutation = useUpdateScheduleWithCourses();
  const { data: classes = [] } = useAdminClasses();
  const { data: trainers = [] } = useTrainers();
  const form = useForm<ScheduleFormData>({
    defaultValues: scheduleFormDefaultValues,
  });

  useEffect(() => {
    if (!schedule) return;
    form.reset(scheduleToFormValues(schedule));
  }, [schedule, form]);

  if (isLoading) {
    return (
      <RouteDialog title="Edit Schedule" closeHref={closeHref}>
        <FormSkeleton fields={8} />
      </RouteDialog>
    );
  }

  if (error || !schedule || Number.isNaN(scheduleId)) {
    return (
      <RouteDialog title="Edit Schedule" closeHref="/admin/schedules">
        <p className="text-sm text-muted-foreground">Schedule not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Schedule"
      description="Update schedule information"
      closeHref={closeHref}
      className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
    >
      <ScheduleForm
        form={form}
        classes={Array.isArray(classes) ? classes : []}
        trainers={Array.isArray(trainers) ? trainers : []}
        submitLabel="Update Schedule"
        isSubmitting={updateMutation.isPending}
        isEdit
        onSubmit={(data) => {
          updateMutation.mutate(
            {
              scheduleId,
              data: mapScheduleToApi(data, classes as any[]),
            },
            { onSuccess: () => router.push(closeHref) },
          );
        }}
      />
    </RouteDialog>
  );
}
