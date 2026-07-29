"use client";

import { useParams } from "next/navigation";
import { MemberCourseDetailsView } from "@/components/member/member-course-details-view";

export default function MemberCourseDetailPage() {
  const params = useParams();
  const courseId = Number(params.id);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Invalid course.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <MemberCourseDetailsView courseId={courseId} />
    </div>
  );
}
