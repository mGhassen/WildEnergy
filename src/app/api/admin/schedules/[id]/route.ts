import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  assertCourseDeletableWithAutoCancel,
  deleteCourseWithRegistrationCleanup,
} from '@/lib/course-delete-cleanup';
import {
  buildExpectedCourseDates,
  courseSyncPayloadFromSchedule,
  dateOnly,
  isCourseProtectedFromScheduleSync,
  newCourseRowFromSchedule,
  type CourseForSync,
  type ScheduleTemplate,
} from '@/lib/schedule-course-sync';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/schedules\/([^/]+)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch schedule with all related data - including category and group details
    const { data: schedule, error: scheduleError } = await supabaseServer()
      .from('schedules')
      .select(`
        *,
        classes (
          id, name, max_capacity, duration, category_id,
          category:categories (
            id, name, color
          )
        )
      `)
      .eq('id', id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get trainer details from user_profiles view using trainer_id
    let trainerUser = null;
    if (schedule.trainer_id) {
      const { data: userData } = await supabaseServer()
        .from('user_profiles')
        .select('trainer_id, first_name, last_name, email, phone, specialization, experience_years, bio, certification, hourly_rate, trainer_status')
        .eq('trainer_id', schedule.trainer_id)
        .single();
      
      if (userData) {
        trainerUser = userData;
      }
    }

    // Transform the data to match frontend expectations
    const transformedSchedule = {
      ...schedule,
      classId: schedule.class_id,
      trainerId: schedule.trainer_id,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      dayOfWeek: schedule.day_of_week,
      daysOfWeek: schedule.days_of_week ?? (schedule.day_of_week != null ? [schedule.day_of_week] : []),
      repetitionType: schedule.repetition_type,
      scheduleDate: schedule.schedule_date ? schedule.schedule_date.split('T')[0] : "",
      startDate: schedule.start_date ? schedule.start_date.split('T')[0] : "",
      endDate: schedule.end_date ? schedule.end_date.split('T')[0] : "",
      isActive: schedule.is_active,
      class: schedule.classes ? {
        ...schedule.classes,
        category: schedule.classes.category,
        group: schedule.classes.category?.group,
      } : null,
      trainer: trainerUser ? {
        id: trainerUser.trainer_id,
        firstName: trainerUser.first_name || "",
        lastName: trainerUser.last_name || "",
        email: trainerUser.email || "",
        phone: trainerUser.phone || "",
        specialization: trainerUser.specialization,
        experience_years: trainerUser.experience_years,
        bio: trainerUser.bio,
        certification: trainerUser.certification,
        hourly_rate: trainerUser.hourly_rate,
        status: trainerUser.trainer_status,
      } : null,
    };

    return NextResponse.json(transformedSchedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    const daysOfWeek: number[] | null =
      Array.isArray(body.days_of_week) && body.days_of_week.length
        ? [...new Set((body.days_of_week as number[]).map(Number))].sort((a, b) => a - b)
        : body.day_of_week != null
          ? [Number(body.day_of_week)]
          : null;

    const { data: oldSchedule, error: scheduleError } = await supabaseServer()
      .from('schedules')
      .select(`
        id,
        class_id,
        trainer_id,
        day_of_week,
        days_of_week,
        start_time,
        end_time,
        max_participants,
        repetition_type,
        schedule_date,
        start_date,
        end_date,
        is_active,
        courses(
          id,
          schedule_id,
          class_id,
          trainer_id,
          course_date,
          start_time,
          end_time,
          max_participants,
          status,
          class_registrations(
            id,
            status,
            checkins(id)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (scheduleError || !oldSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const oldTemplate = oldSchedule as ScheduleTemplate & { courses?: CourseForSync[] };
    const existingCourses = (oldTemplate.courses || []) as CourseForSync[];

    const { data: updatedSchedule, error: updateError } = await supabaseServer()
      .from('schedules')
      .update({
        class_id: body.class_id,
        trainer_id: body.trainer_id,
        day_of_week: daysOfWeek?.[0] ?? body.day_of_week ?? null,
        days_of_week: daysOfWeek,
        start_time: body.start_time,
        end_time: body.end_time,
        max_participants: body.max_participants,
        repetition_type: body.repetition_type,
        schedule_date: body.schedule_date,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select(`
        *,
        classes(id, max_capacity)
      `)
      .single();

    if (updateError || !updatedSchedule) {
      return NextResponse.json({ error: 'Failed to update schedule', details: updateError?.message }, { status: 500 });
    }

    if (body.is_active === false) {
      const { error: updateCoursesError } = await supabaseServer()
        .from('courses')
        .update({ is_active: false })
        .eq('schedule_id', id);

      if (updateCoursesError) {
        console.error('Error updating courses to inactive:', updateCoursesError);
        return NextResponse.json({
          error: 'Schedule updated but failed to deactivate related courses',
          details: updateCoursesError.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        ...updatedSchedule,
        updatedCourses: 0,
        addedCourses: 0,
        removedCourses: 0,
        skippedCourses: existingCourses.length,
        message: 'Schedule updated and set to inactive. Related courses have been deactivated.',
      });
    }

    try {
      const newTemplate = updatedSchedule as ScheduleTemplate;
      const expectedDates = buildExpectedCourseDates(newTemplate);
      if (expectedDates.length === 0) {
        return NextResponse.json({
          error: newTemplate.repetition_type === 'once'
            ? 'No schedule_date for one-time event'
            : 'Missing start_date or end_date for recurring event',
        }, { status: 400 });
      }

      const maxParticipants =
        newTemplate.max_participants !== null && newTemplate.max_participants !== undefined
          ? newTemplate.max_participants
          : ((updatedSchedule.classes as { max_capacity?: number } | null)?.max_capacity || 10);

      const syncPayload = courseSyncPayloadFromSchedule(newTemplate);
      const expectedSet = new Set(expectedDates);
      const coursesByDate = new Map<string, CourseForSync[]>();
      for (const course of existingCourses) {
        const key = dateOnly(course.course_date);
        const list = coursesByDate.get(key) || [];
        list.push(course);
        coursesByDate.set(key, list);
      }

      let updatedCourses = 0;
      let removedCourses = 0;
      let skippedCourses = 0;
      const coursesToInsert: ReturnType<typeof newCourseRowFromSchedule>[] = [];
      const keptCourseIds = new Set<number>();

      for (const [courseDate, coursesOnDate] of coursesByDate) {
        const protectedOnDate = coursesOnDate.filter((c) =>
          isCourseProtectedFromScheduleSync(c, oldTemplate),
        );
        const unprotectedOnDate = coursesOnDate.filter(
          (c) => !isCourseProtectedFromScheduleSync(c, oldTemplate),
        );

        // Keep all protected rows; among unprotected, keep at most one (prefer if date still expected).
        const keeper =
          protectedOnDate[0] ||
          (expectedSet.has(courseDate) ? unprotectedOnDate[0] : undefined);

        for (const course of coursesOnDate) {
          const isProtected = isCourseProtectedFromScheduleSync(course, oldTemplate);

          if (isProtected) {
            skippedCourses++;
            keptCourseIds.add(course.id);
            continue;
          }

          if (keeper && course.id === keeper.id && expectedSet.has(courseDate)) {
            const { error: syncError } = await supabaseServer()
              .from('courses')
              .update(syncPayload)
              .eq('id', course.id);

            if (syncError) {
              console.error('Error syncing course:', syncError);
              return NextResponse.json({
                error: 'Schedule updated but failed to sync related courses',
                details: syncError.message,
              }, { status: 500 });
            }
            updatedCourses++;
            keptCourseIds.add(course.id);
            continue;
          }

          // Duplicate on same date, or date no longer in template → remove empty future course
          const { error: deleteError } = await supabaseServer()
            .from('courses')
            .delete()
            .eq('id', course.id);

          if (deleteError) {
            console.error('Error removing obsolete course:', deleteError);
            return NextResponse.json({
              error: 'Schedule updated but failed to remove obsolete courses',
              details: deleteError.message,
            }, { status: 500 });
          }
          removedCourses++;
        }
      }

      for (const courseDate of expectedDates) {
        const existingOnDate = coursesByDate.get(courseDate) || [];
        const stillKept = existingOnDate.some((c) => keptCourseIds.has(c.id));
        if (stillKept) continue;
        coursesToInsert.push(newCourseRowFromSchedule(newTemplate, courseDate, maxParticipants));
      }

      if (coursesToInsert.length > 0) {
        const { error: insertError } = await supabaseServer()
          .from('courses')
          .insert(coursesToInsert);

        if (insertError) {
          console.error('Error inserting missing courses:', insertError);
          return NextResponse.json({
            error: 'Schedule updated but failed to add missing courses',
            details: insertError.message,
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        ...updatedSchedule,
        updatedCourses,
        addedCourses: coursesToInsert.length,
        removedCourses,
        skippedCourses,
        regeneratedCourses: updatedCourses + coursesToInsert.length,
        message: `Schedule updated: ${updatedCourses} courses updated, ${coursesToInsert.length} added, ${removedCourses} removed, ${skippedCourses} skipped (done / members / already edited).`,
      });
    } catch (courseError) {
      console.error('Error during course sync:', courseError);
      return NextResponse.json({
        error: 'Schedule updated but failed to sync courses',
        details: String(courseError),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if schedule exists and get related courses with registrations and checkins
    const { data: schedule, error: scheduleError } = await supabaseServer()
      .from('schedules')
      .select(`
        id,
        trainer_id,
        classes!inner(id, name),
        courses(
          id,
          course_date,
          start_time,
          status,
          class_registrations(
            id,
            status,
            member_id,
            checkins(id)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Count related data
    const coursesCount = schedule.courses?.length || 0;
    const activeCoursesCount = schedule.courses?.filter((course: any) => 
      course.status === 'scheduled' || course.status === 'in_progress'
    ).length || 0;
    
    for (const course of schedule.courses || []) {
      const regs = (course.class_registrations || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        member_id: r.member_id,
      }));
      const checkinsForCourse: { registration_id: number }[] = [];
      for (const reg of course.class_registrations || []) {
        const n = (reg.checkins || []).length;
        for (let i = 0; i < n; i++) {
          checkinsForCourse.push({ registration_id: reg.id });
        }
      }
      const reason = assertCourseDeletableWithAutoCancel(
        {
          course_date: course.course_date,
          start_time: course.start_time,
        },
        regs,
        checkinsForCourse
      );
      if (reason) {
        const message =
          reason === 'checkins'
            ? 'A course under this schedule has check-ins.'
            : reason === 'attended'
              ? 'A course has attended registrations.'
              : reason === 'past_registered'
                ? 'A course that has already started still has active registrations.'
                : 'A registration is missing member data.';
        return NextResponse.json(
          {
            error: 'Cannot delete schedule',
            message,
            details: {
              reason,
              coursesCount,
              scheduleName: (schedule.classes as any)?.name || 'Unknown',
              trainerName: 'Unknown',
            },
          },
          { status: 400 }
        );
      }
    }

    // Get trainer user details
    const { data: trainerUser } = await supabaseServer()
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('trainer_id', schedule.trainer_id)
      .single();

    const sb = supabaseServer();
    for (const course of schedule.courses || []) {
      const del = await deleteCourseWithRegistrationCleanup(sb, course.id);
      if (!del.ok) {
        return NextResponse.json(
          {
            error: 'Failed to delete schedule courses',
            details: del.error,
            courseId: course.id,
          },
          { status: del.status }
        );
      }
    }

    const { error: deleteError } = await supabaseServer()
      .from('schedules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete schedule', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Schedule deleted successfully',
      deletedCourses: coursesCount,
      activeCourses: activeCoursesCount,
      scheduleName: (schedule.classes as any)?.name || 'Unknown',
      trainerName: trainerUser ? `${trainerUser.first_name} ${trainerUser.last_name}` : 'Unknown'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) return NextResponse.json({ error: 'No schedule id' }, { status: 400 });

    console.log('🔄 POST /api/admin/schedules/' + id + ' - Starting course generation');

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      console.log('❌ Invalid or expired token:', authError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      console.log('❌ Admin access required for user:', adminUser.email);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Authentication successful for user:', adminUser.email);

    const { data: schedule, error } = await supabaseServer()
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !schedule) {
      console.error('Schedule not found:', { id, error });
      return NextResponse.json({ error: 'Schedule not found', details: error }, { status: 404 });
    }

    const { data: classData } = await supabaseServer()
      .from('classes')
      .select('id, max_capacity')
      .eq('id', schedule.class_id)
      .single();

    const { data: existingCourses, error: existingError } = await supabaseServer()
      .from('courses')
      .select('id, course_date')
      .eq('schedule_id', id);

    if (existingError) {
      return NextResponse.json({ error: 'Failed to fetch existing courses', details: existingError }, { status: 500 });
    }

    const existingDates = new Set(
      (existingCourses || []).map((c: { course_date: string }) => dateOnly(c.course_date)),
    );

    const template = schedule as ScheduleTemplate;
    const expectedDates = buildExpectedCourseDates(template);
    if (expectedDates.length === 0) {
      return NextResponse.json({
        error: template.repetition_type === 'once'
          ? 'No schedule_date for one-time event'
          : 'Missing start_date or end_date for recurring event',
      }, { status: 400 });
    }

    const maxParticipants =
      schedule.max_participants !== null && schedule.max_participants !== undefined
        ? schedule.max_participants
        : (classData?.max_capacity || 10);

    const coursesToInsert = expectedDates
      .filter((courseDate) => !existingDates.has(courseDate))
      .map((courseDate) => newCourseRowFromSchedule(template, courseDate, maxParticipants));

    if (coursesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        skippedExisting: existingDates.size,
        message: 'All expected courses already exist',
      });
    }

    const { error: insertError } = await supabaseServer()
      .from('courses')
      .insert(coursesToInsert);
    if (insertError) {
      console.error('❌ Failed to insert courses:', insertError);
      return NextResponse.json({ error: 'Failed to insert courses', details: insertError }, { status: 500 });
    }

    console.log('✅ Successfully inserted', coursesToInsert.length, 'courses for schedule', id);
    return NextResponse.json({ success: true, count: coursesToInsert.length });
  } catch (error) {
    console.error('Error generating courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 