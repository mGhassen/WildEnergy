import { registrationStatusBlocksDelete } from '@/lib/course-delete-rules';

export type ScheduleTemplate = {
  id: number;
  class_id: number;
  trainer_id: string | null;
  day_of_week: number | null;
  days_of_week?: number[] | null;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  repetition_type: string | null;
  schedule_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export function resolveWeeklyDays(
  schedule: Pick<ScheduleTemplate, 'day_of_week' | 'days_of_week'>,
): number[] {
  const fromArray = (schedule.days_of_week || []).filter((d) => d >= 0 && d <= 6);
  if (fromArray.length) return [...new Set(fromArray)].sort((a, b) => a - b);
  if (schedule.day_of_week !== null && schedule.day_of_week !== undefined) {
    return [schedule.day_of_week];
  }
  return [];
}

export type CourseForSync = {
  id: number;
  schedule_id: number;
  class_id: number;
  trainer_id: string | null;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  status: string;
  class_registrations?: Array<{
    id: number;
    status: string;
    checkins?: Array<{ id: number }>;
  }>;
};

export function normalizeTime(value: string | null | undefined): string {
  if (!value) return '';
  const [h = '00', m = '00', s = '00'] = String(value).split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${(s || '00').padStart(2, '0').slice(0, 2)}`;
}

export function dateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).split('T')[0];
}

export function courseIsDone(course: Pick<CourseForSync, 'status' | 'course_date' | 'end_time'>): boolean {
  if (course.status === 'completed' || course.status === 'cancelled') return true;

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0];
  const courseDate = dateOnly(course.course_date);
  const endTime = normalizeTime(course.end_time);

  return courseDate < currentDate || (courseDate === currentDate && endTime < currentTime);
}

export function courseHasMembers(course: CourseForSync): boolean {
  for (const reg of course.class_registrations || []) {
    if (registrationStatusBlocksDelete(reg.status)) return true;
    if ((reg.checkins || []).length > 0) return true;
  }
  return false;
}

/** True when course fields already diverge from the schedule template (manual edit). */
export function courseIsEditedVsSchedule(
  course: Pick<CourseForSync, 'class_id' | 'trainer_id' | 'start_time' | 'end_time' | 'max_participants'>,
  schedule: Pick<ScheduleTemplate, 'class_id' | 'trainer_id' | 'start_time' | 'end_time' | 'max_participants'>,
): boolean {
  return (
    course.class_id !== schedule.class_id ||
    course.trainer_id !== schedule.trainer_id ||
    normalizeTime(course.start_time) !== normalizeTime(schedule.start_time) ||
    normalizeTime(course.end_time) !== normalizeTime(schedule.end_time) ||
    course.max_participants !== schedule.max_participants
  );
}

export function isCourseProtectedFromScheduleSync(
  course: CourseForSync,
  oldSchedule: ScheduleTemplate,
): boolean {
  return (
    courseIsDone(course) ||
    courseHasMembers(course) ||
    courseIsEditedVsSchedule(course, oldSchedule)
  );
}

export function buildExpectedCourseDates(schedule: ScheduleTemplate): string[] {
  const repetitionType = schedule.repetition_type || 'once';

  if (repetitionType === 'once') {
    const once = dateOnly(schedule.schedule_date);
    return once ? [once] : [];
  }

  const startDate = dateOnly(schedule.start_date);
  const endDate = dateOnly(schedule.end_date);
  if (!startDate || !endDate) return [];

  const dates: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  const weeklyDays = resolveWeeklyDays(schedule);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (
      (repetitionType === 'weekly' && weeklyDays.includes(d.getDay())) ||
      repetitionType === 'daily'
    ) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  return dates;
}

export function courseSyncPayloadFromSchedule(schedule: ScheduleTemplate): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    class_id: schedule.class_id,
    trainer_id: schedule.trainer_id,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    updated_at: new Date().toISOString(),
  };
  if (schedule.max_participants !== null && schedule.max_participants !== undefined) {
    payload.max_participants = schedule.max_participants;
  }
  return payload;
}

export function newCourseRowFromSchedule(
  schedule: ScheduleTemplate,
  courseDate: string,
  maxParticipants: number,
) {
  return {
    schedule_id: schedule.id,
    class_id: schedule.class_id,
    trainer_id: schedule.trainer_id,
    course_date: courseDate,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    max_participants: maxParticipants,
    is_active: true,
    status: 'scheduled' as const,
  };
}

export type ScheduleEditBlockReason = 'members' | 'done' | 'edited';

export function describeScheduleEditBlock(reason: ScheduleEditBlockReason): string {
  switch (reason) {
    case 'members':
      return 'This schedule has courses with member registrations or check-ins. Cancel registrations first or edit individual courses.';
    case 'done':
      return 'This schedule has courses that are already done. Edit individual courses instead.';
    case 'edited':
      return 'This schedule has courses that were manually edited. Edit individual courses instead.';
  }
}

/** Block schedule-template edit when any course is protected. */
export function getScheduleEditBlockReason(params: {
  schedule: ScheduleTemplate;
  courses: Array<
    Pick<
      CourseForSync,
      | 'id'
      | 'class_id'
      | 'trainer_id'
      | 'course_date'
      | 'start_time'
      | 'end_time'
      | 'max_participants'
      | 'status'
    > & { isEdited?: boolean }
  >;
  courseHasMembers: (courseId: number) => boolean;
}): ScheduleEditBlockReason | null {
  for (const course of params.courses) {
    if (params.courseHasMembers(course.id)) return 'members';
    if (courseIsDone(course)) return 'done';
    if (course.isEdited === true || courseIsEditedVsSchedule(course, params.schedule)) {
      return 'edited';
    }
  }
  return null;
}
