import type { SupabaseClient } from "@supabase/supabase-js";

export function courseStartHasPassed(
  courseDate: string,
  startTime: string
): boolean {
  const courseDateTime = new Date(`${courseDate}T${startTime}`);
  return new Date() >= courseDateTime;
}

/** Client + server: when null, course can be deleted (possibly after server-side auto-cancel). */
export function assertCourseDeletableWithAutoCancel(
  course: { course_date: string; start_time: string },
  regs: Array<{ id: number; status: string; member_id?: string | null }>,
  globalCheckins: Array<{ registration_id: number }>
): string | null {
  const regIds = new Set(regs.map((r) => r.id));
  if (globalCheckins.some((c) => regIds.has(c.registration_id))) {
    return "checkins";
  }
  if (regs.some((r) => r.status === "attended")) {
    return "attended";
  }
  const past = courseStartHasPassed(course.course_date, course.start_time);
  if (past && regs.some((r) => r.status === "registered")) {
    return "past_registered";
  }
  if (regs.some((r) => r.status === "registered" && !r.member_id)) {
    return "missing_member";
  }
  return null;
}

export function assertScheduleDeletableWithAutoCancel(
  scheduleCourses: Array<{
    id: number;
    course_date: string;
    start_time: string;
  }>,
  registrations: Array<{
    course_id: number;
    id: number;
    status: string;
    member_id?: string | null;
  }>,
  checkins: Array<{ registration_id: number }>
): string | null {
  for (const course of scheduleCourses) {
    const regs = registrations.filter((r) => r.course_id === course.id);
    const reason = assertCourseDeletableWithAutoCancel(
      course,
      regs.map((r) => ({
        id: r.id,
        status: r.status,
        member_id: r.member_id,
      })),
      checkins
    );
    if (reason) return reason;
  }
  return null;
}

export function describeCourseDeleteBlockReason(reason: string): string {
  switch (reason) {
    case "checkins":
      return "Cannot delete: course has check-ins.";
    case "attended":
      return "Cannot delete: course has attended registrations.";
    case "past_registered":
      return "Cannot delete: active registrations exist for a course that has already started.";
    case "missing_member":
      return "Cannot delete: a registration is missing member data.";
    default:
      return "Cannot delete course.";
  }
}

export async function deleteCourseWithRegistrationCleanup(
  supabase: SupabaseClient,
  courseId: number
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("id, course_date, start_time")
    .eq("id", courseId)
    .single();

  if (courseErr || !course) {
    return {
      ok: false,
      error: courseErr?.message || "Course not found",
      status: 404,
    };
  }

  const { data: registrations, error: regErr } = await supabase
    .from("class_registrations")
    .select("id, status, member_id, subscription_id")
    .eq("course_id", courseId);

  if (regErr) {
    return { ok: false, error: regErr.message, status: 500 };
  }

  const regs = registrations || [];

  const { data: checkins, error: chErr } = await supabase
    .from("checkins")
    .select(
      `
      id,
      registration_id,
      class_registrations!inner(course_id)
    `
    )
    .eq("class_registrations.course_id", courseId);

  if (chErr) {
    return { ok: false, error: chErr.message, status: 500 };
  }

  const checkinRows =
    (checkins || []) as Array<{ registration_id: number }>;

  const preBlock = assertCourseDeletableWithAutoCancel(
    course,
    regs.map((r) => ({
      id: r.id,
      status: r.status,
      member_id: r.member_id,
    })),
    checkinRows
  );

  if (preBlock) {
    return {
      ok: false,
      error: describeCourseDeleteBlockReason(preBlock),
      status: 400,
    };
  }

  const activeRegs = regs.filter((r) => r.status === "registered");

  for (const r of activeRegs) {
    if (!r.member_id) {
      return {
        ok: false,
        error: describeCourseDeleteBlockReason("missing_member"),
        status: 400,
      };
    }

    const courseDateTime = new Date(
      `${course.course_date}T${course.start_time}`
    );
    const now = new Date();
    const isWithin24Hours =
      now >=
      new Date(courseDateTime.getTime() - 24 * 60 * 60 * 1000);

    const { error: rpcError } = await supabase.rpc(
      "cancel_registration_with_updates",
      {
        p_registration_id: r.id,
        p_user_id: r.member_id,
        p_is_within_24_hours: isWithin24Hours,
        p_subscription_id: r.subscription_id ?? null,
        p_force_refund: true,
      }
    );

    if (rpcError) {
      console.error("cancel_registration_with_updates failed:", rpcError);
      return {
        ok: false,
        error: rpcError.message || "Failed to cancel a registration",
        status: 500,
      };
    }
  }

  const { error: delRegs } = await supabase
    .from("class_registrations")
    .delete()
    .eq("course_id", courseId);

  if (delRegs) {
    return { ok: false, error: delRegs.message, status: 500 };
  }

  const { error: delCourse } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (delCourse) {
    return { ok: false, error: delCourse.message, status: 500 };
  }

  return { ok: true };
}
