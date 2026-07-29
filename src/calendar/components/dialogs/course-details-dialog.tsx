"use client";

import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MemberCourseDetailsView } from "@/components/member/member-course-details-view";
import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  event: IEvent;
  children: React.ReactNode;
}

/** Soft-open course details when calendar eventMode is "dialog". Prefer navigation to /member/courses/[id]. */
export function CourseDetailsDialog({ event, children }: IProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[90vh] sm:max-w-2xl sm:max-h-[80vh] overflow-y-auto">
        <MemberCourseDetailsView courseId={event.id} showBack={false} />
      </DialogContent>
    </Dialog>
  );
}
