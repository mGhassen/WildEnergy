"use client";

import { useParams, useRouter } from "next/navigation";
import { CourseEditDialog } from "@/components/course-edit-dialog";
import { useCourse } from "@/hooks/useCourse";
import { FormSkeleton } from "@/components/skeletons";
import { RouteDialog } from "@/components/route-dialog";

export default function AdminCourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const closeHref = `/admin/courses/${courseId}`;
  const { data: course, isLoading, error } = useCourse(courseId);

  if (isLoading) {
    return (
      <RouteDialog title="Edit Course" closeHref={closeHref}>
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  if (error || !course || Number.isNaN(courseId)) {
    return (
      <RouteDialog title="Edit Course" closeHref="/admin/courses">
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </RouteDialog>
    );
  }

  return (
    <CourseEditDialog
      course={course}
      isOpen
      onClose={() => router.push(closeHref)}
    />
  );
}
