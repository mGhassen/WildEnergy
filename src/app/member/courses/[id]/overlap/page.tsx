"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useForceRegistration } from "@/hooks/useRegistrations";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatTime } from "@/lib/date";

type OverlapCourse = {
  courseId?: number;
  courseName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  trainer?: string;
  course_date?: string;
  start_time?: string;
  end_time?: string;
};

function overlapStorageKey(courseId: number | string) {
  return `member-course-overlap:${courseId}`;
}

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}

function normalizeOverlapCourses(raw: unknown): OverlapCourse[] {
  if (Array.isArray(raw)) return raw as OverlapCourse[];
  if (raw && typeof raw === "object") return [raw as OverlapCourse];
  return [];
}

function MemberCourseOverlapContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Number(params.id);
  const closeHref = safeFrom(searchParams.get("from"), "/member/courses");
  const onCancel = useCloseHref(closeHref);
  const forceRegistrationMutation = useForceRegistration();

  const [overlappingCourses, setOverlappingCourses] = useState<OverlapCourse[]>(
    [],
  );

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    try {
      const key = overlapStorageKey(courseId);
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setOverlappingCourses(normalizeOverlapCourses(JSON.parse(stored)));
        sessionStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
  }, [courseId]);

  return (
    <RouteDialog
      title="Course Time Conflict"
      description="This course overlaps with other courses you're already registered for. Are you sure you want to register anyway?"
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Overlapping courses:
        </div>
        {overlappingCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            A time conflict was detected with one of your existing
            registrations.
          </p>
        ) : (
          overlappingCourses.map((course, index) => {
            const name = course.courseName || "Conflicting course";
            const date = course.date || course.course_date;
            const start = course.startTime || course.start_time;
            const end = course.endTime || course.end_time;
            return (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <div className="font-medium text-sm">{name}</div>
                {(date || start) && (
                  <div className="text-xs text-muted-foreground">
                    {date ? formatDate(date) : ""}
                    {date && start ? " • " : ""}
                    {start ? formatTime(start) : ""}
                    {start && end ? ` - ${formatTime(end)}` : ""}
                  </div>
                )}
                {course.trainer && (
                  <div className="text-xs text-muted-foreground">
                    with {course.trainer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!Number.isFinite(courseId)) return;
            forceRegistrationMutation.mutate(courseId, {
              onSuccess: () => router.replace(closeHref),
            });
          }}
          disabled={
            forceRegistrationMutation.isPending || !Number.isFinite(courseId)
          }
        >
          {forceRegistrationMutation.isPending
            ? "Registering..."
            : "Register Anyway"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}

export default function MemberCourseOverlapPage() {
  return (
    <Suspense
      fallback={
        <RouteDialog title="Course Time Conflict" closeHref="/member/courses">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </RouteDialog>
      }
    >
      <MemberCourseOverlapContent />
    </Suspense>
  );
}
