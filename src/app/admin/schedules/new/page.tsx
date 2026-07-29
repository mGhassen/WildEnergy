"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { RouteDialog } from "@/components/route-dialog";
import { useCreateScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { useAdminClasses } from "@/hooks/useAdmin";
import { useTrainers } from "@/hooks/useTrainers";
import {
  ScheduleForm,
  scheduleFormDefaultValues,
  mapScheduleToApi,
  type ScheduleFormData,
} from "../schedule-form";

const CLOSE_HREF = "/admin/schedules";

export default function AdminNewSchedulePage() {
  const router = useRouter();
  const createMutation = useCreateScheduleWithCourses();
  const { data: classes = [] } = useAdminClasses();
  const { data: trainers = [] } = useTrainers();
  const form = useForm<ScheduleFormData>({
    defaultValues: scheduleFormDefaultValues,
  });

  return (
    <RouteDialog
      title="Add New Schedule"
      description="Add a new schedule to the gym"
      closeHref={CLOSE_HREF}
      className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
    >
      <ScheduleForm
        form={form}
        classes={Array.isArray(classes) ? classes : []}
        trainers={Array.isArray(trainers) ? trainers : []}
        submitLabel="Create Schedule"
        isSubmitting={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(mapScheduleToApi(data, classes as any[]), {
            onSuccess: (schedule: any) => {
              router.push(
                schedule?.id
                  ? `/admin/schedules/${schedule.id}`
                  : CLOSE_HREF,
              );
            },
          });
        }}
      />
    </RouteDialog>
  );
}
