"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCourse, useDeleteCourse } from "@/hooks/useCourse";
import { useAdminCheckins } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";
import {
  assertCourseDeletableWithAutoCancel,
  describeCourseDeleteBlockReason,
} from "@/lib/course-delete-cleanup";

export default function AdminCourseDeletePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = Number(params.id);
  const closeHref = `/admin/courses/${courseId}`;
  const onCancel = useCloseHref(closeHref);
  const { data: course, isLoading, error } = useCourse(courseId);
  const { data: checkins = [] } = useAdminCheckins();
  const deleteCourseMutation = useDeleteCourse();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Course" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !course || Number.isNaN(courseId)) {
    return (
      <RouteDialog title="Delete Course" closeHref="/admin/courses">
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </RouteDialog>
    );
  }

  const regs = ((course as any).registrations || []).map((r: any) => ({
    id: r.id,
    status: r.status,
    member_id: r.member_id ?? r.member?.id,
  }));
  const courseDeleteBlockReason = assertCourseDeletableWithAutoCancel(
    {
      course_date: (course as any).course_date ?? (course as any).courseDate,
      start_time: (course as any).start_time ?? (course as any).startTime,
    },
    regs,
    (checkins as any[]).map((c) => ({
      registration_id: c.registration_id ?? c.registrationId,
    })),
  );
  const canDelete = courseDeleteBlockReason === null;

  return (
    <RouteDialog
      title="Delete Course"
      description="Are you sure you want to delete this course? This action cannot be undone."
      closeHref={closeHref}
    >
      {canDelete && regs.some((r: any) => r.status === "registered") && (
        <p className="text-sm text-amber-700 font-medium mb-4">
          Active registrations will be cancelled, sessions refunded where
          applicable, then removed with the course.
        </p>
      )}
      {!canDelete && courseDeleteBlockReason && (
        <p className="text-sm text-red-600 font-medium mb-4">
          {describeCourseDeleteBlockReason(courseDeleteBlockReason)}
        </p>
      )}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={!canDelete || deleteCourseMutation.isPending}
          onClick={() => {
            deleteCourseMutation.mutate(courseId, {
              onSuccess: () => {
                toast({
                  title: "Course deleted",
                  description: "The course has been successfully deleted.",
                });
                router.push("/admin/courses");
              },
            });
          }}
        >
          {deleteCourseMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </RouteDialog>
  );
}
