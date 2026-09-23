/** Statuses that occupy a seat on a course (booked / capacity). */
export const ACTIVE_REGISTRATION_STATUSES = [
  "registered",
  "attended",
  "absent",
] as const;

export type ActiveRegistrationStatus =
  (typeof ACTIVE_REGISTRATION_STATUSES)[number];

export function isActiveRegistrationStatus(
  status: string | null | undefined,
): status is ActiveRegistrationStatus {
  return (
    status === "registered" || status === "attended" || status === "absent"
  );
}

export function countActiveRegistrations(
  registrations: { status?: string | null }[] | null | undefined,
): number {
  return (registrations || []).filter((r) =>
    isActiveRegistrationStatus(r.status),
  ).length;
}

type SbClient = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

/**
 * Count non-cancelled registrations per course, paging past PostgREST max_rows.
 */
export async function fetchActiveParticipantCountsByCourse(
  sb: SbClient,
  courseIds?: number[],
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (courseIds && courseIds.length === 0) return counts;

  const pageSize = 1000;
  let from = 0;

  for (;;) {
    let query = sb
      .from("class_registrations")
      .select("course_id")
      .in("status", [...ACTIVE_REGISTRATION_STATUSES])
      .range(from, from + pageSize - 1);

    if (courseIds?.length) {
      query = query.in("course_id", courseIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error("fetchActiveParticipantCountsByCourse:", error);
      break;
    }

    for (const row of data || []) {
      const id = row.course_id as number;
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return counts;
}

/**
 * Recount and persist courses.current_participants for one course.
 * Prefers the DB sync RPC (post-migration); falls back to a manual recount.
 */
export async function syncCourseCurrentParticipants(
  sb: SbClient,
  courseId: number,
): Promise<number> {
  const { data, error } = await sb.rpc("sync_course_current_participants", {
    p_course_id: courseId,
  });
  if (!error && typeof data === "number") {
    return data;
  }

  const { count, error: countError } = await sb
    .from("class_registrations")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId)
    .in("status", [...ACTIVE_REGISTRATION_STATUSES]);

  if (countError) {
    console.error("syncCourseCurrentParticipants count:", countError);
    return 0;
  }

  const active = count ?? 0;
  const { error: updateError } = await sb
    .from("courses")
    .update({ current_participants: active })
    .eq("id", courseId);

  if (updateError) {
    console.error("syncCourseCurrentParticipants update:", updateError);
  }

  return active;
}
