"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { RouteDialog } from "@/components/route-dialog";
import { useSchedule } from "@/hooks/useSchedules";
import { useUpdateScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { useAdminClasses, useAdminRegistrations, useAdminCheckins } from "@/hooks/useAdmin";
import { useTrainers } from "@/hooks/useTrainers";
import { useCourses } from "@/hooks/useCourse";
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
import { registrationStatusBlocksDelete } from "@/lib/course-delete-rules";
import {
  describeScheduleEditBlock,
  getScheduleEditBlockReason,
  type ScheduleEditBlockReason,
} from "@/lib/schedule-course-sync";
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
  const { data: courses = [] } = useCourses();
  const { data: registrations = [] } = useAdminRegistrations();
  const { data: checkins = [] } = useAdminCheckins();
  const [editBlockedReason, setEditBlockedReason] = useState<ScheduleEditBlockReason | null>(null);
  const form = useForm<ScheduleFormData>({
    defaultValues: scheduleFormDefaultValues,
  });

  const scheduleCourses = useMemo(
    () => (courses as any[]).filter((c: any) => c.schedule_id === scheduleId),
    [courses, scheduleId],
  );

  const blockReason = useMemo((): ScheduleEditBlockReason | null => {
    if (!schedule) return null;
    return getScheduleEditBlockReason({
      schedule: {
        id: schedule.id,
        class_id: schedule.class_id,
        trainer_id: schedule.trainer_id,
        day_of_week: schedule.day_of_week,
        days_of_week: (schedule as any).days_of_week ?? null,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        max_participants: schedule.max_participants,
        repetition_type: schedule.repetition_type,
        schedule_date: schedule.schedule_date,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
      },
      courses: scheduleCourses,
      courseHasMembers: (courseId) => {
        const regs = (registrations as any[]).filter((r: any) => r.course_id === courseId);
        if (regs.some((r: any) => registrationStatusBlocksDelete(r.status))) return true;
        const regIds = new Set(regs.map((r: any) => r.id));
        return (checkins as any[]).some(
          (ch: any) => regIds.has(ch.registration_id) || regIds.has(ch.registration?.id),
        );
      },
    });
  }, [schedule, scheduleCourses, registrations, checkins]);

  useEffect(() => {
    if (!schedule) return;
    form.reset(scheduleToFormValues(schedule));
  }, [schedule, form]);

  useEffect(() => {
    if (isLoading || !schedule || blockReason === null) return;
    setEditBlockedReason(blockReason);
  }, [isLoading, schedule, blockReason]);

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

  if (blockReason) {
    return (
      <AlertDialog
        open={editBlockedReason !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditBlockedReason(null);
            router.replace(closeHref);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot edit schedule</AlertDialogTitle>
            <AlertDialogDescription>
              {describeScheduleEditBlock(blockReason)}
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
            { onSuccess: () => router.replace(closeHref) },
          );
        }}
      />
    </RouteDialog>
  );
}
