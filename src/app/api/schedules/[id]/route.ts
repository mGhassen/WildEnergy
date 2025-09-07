import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
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
            id, name, color,
            group:groups (
              id, name, color
            )
          )
        ),
        trainers!trainer_id (
          id, user_id, specialization, experience_years, bio, certification
        )
      `)
      .eq('id', id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get trainer user details separately (same as list API)
    let trainerUser = null;
    if (schedule.trainers?.user_id) {
      const { data: userData } = await supabaseServer()
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('id', schedule.trainers.user_id)
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
      trainer: schedule.trainers ? {
        id: schedule.trainers.id,
        firstName: trainerUser?.first_name || "",
        lastName: trainerUser?.last_name || "",
        email: trainerUser?.email || "",
        phone: trainerUser?.phone || "",
        specialization: schedule.trainers.specialization,
        experience_years: schedule.trainers.experience_years,
        bio: schedule.trainers.bio,
        certification: schedule.trainers.certification,
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

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Update the schedule
    const { data: updatedSchedule, error: updateError } = await supabaseServer()
      .from('schedules')
      .update({
        class_id: body.class_id,
        trainer_id: body.trainer_id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        repetition_type: body.repetition_type,
        schedule_date: body.schedule_date,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update schedule', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedSchedule);
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

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if schedule exists and get related courses with registrations and checkins
    const { data: schedule, error: scheduleError } = await supabaseServer()
      .from('schedules')
      .select(`
        id,
        classes!inner(id, name),
        trainers!inner(id, user_id),
        courses(
          id, 
          course_date, 
          status,
          class_registrations(
            id,
            status,
            user_id,
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
    
    // Count registrations and checkins
    let totalRegistrations = 0;
    let totalCheckins = 0;
    let registeredMembers = 0;
    let attendedMembers = 0;
    
    schedule.courses?.forEach((course: any) => {
      const registrations = course.class_registrations || [];
      totalRegistrations += registrations.length;
      
      registrations.forEach((reg: any) => {
        if (reg.status === 'registered') registeredMembers++;
        if (reg.status === 'attended') attendedMembers++;
        
        const checkins = reg.checkins || [];
        totalCheckins += checkins.length;
      });
    });

    // Check if schedule can be deleted (no registrations or attendance)
    if (totalRegistrations > 0 || totalCheckins > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete schedule with existing registrations or attendance',
        message: 'This schedule has members registered or who have attended courses. Please cancel all registrations first.',
        details: {
          totalRegistrations,
          totalCheckins,
          registeredMembers,
          attendedMembers,
          coursesCount,
          scheduleName: (schedule.classes as any)?.name || 'Unknown',
          trainerName: 'Unknown'
        }
      }, { status: 400 });
    }

    // Get trainer user details
    const { data: trainerUser } = await supabaseServer()
      .from('users')
      .select('first_name, last_name')
      .eq('id', (schedule.trainers as any)?.user_id)
      .single();

    // Delete the schedule (courses will be deleted automatically due to CASCADE)
    // No need to delete registrations/checkins since we verified there are none
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
  const id = extractIdFromUrl(request);
  if (!id) return NextResponse.json({ error: 'No schedule id' }, { status: 400 });

  // Fetch the schedule
  const { data: schedule, error } = await supabaseServer()
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !schedule) {
    console.error('Schedule not found:', { id, error });
    return NextResponse.json({ error: 'Schedule not found', details: error }, { status: 404 });
  }
  console.log('Fetched schedule:', schedule);

  // Fetch class for max_capacity
  const { data: classData } = await supabaseServer()
    .from('classes')
    .select('id, max_capacity')
    .eq('id', schedule.class_id)
    .single();
  console.log('Fetched class:', classData);

  // Prepare course generation
  const coursesToInsert = [];
  const repetitionType = schedule.repetition_type || 'once';
  const maxParticipants = classData?.max_capacity || 10;

  if (repetitionType === 'once') {
    // One-time event
    if (!schedule.schedule_date) {
      console.error('No schedule_date for one-time event:', schedule);
      return NextResponse.json({ error: 'No schedule_date for one-time event' }, { status: 400 });
    }
    coursesToInsert.push({
      schedule_id: schedule.id,
      class_id: schedule.class_id,
      trainer_id: schedule.trainer_id,
      course_date: schedule.schedule_date.split('T')[0],
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      max_participants: maxParticipants,
      is_active: true,
      status: 'scheduled',
    });
    console.log('Generated one-time course:', coursesToInsert[0]);
  } else {
    // Recurring event
    const startDate = schedule.start_date ? schedule.start_date.split('T')[0] : undefined;
    const endDate = schedule.end_date ? schedule.end_date.split('T')[0] : undefined;
    if (!startDate || !endDate) {
      console.error('Missing start_date or end_date for recurring event:', schedule);
      return NextResponse.json({ error: 'Missing start_date or end_date for recurring event' }, { status: 400 });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (
        (repetitionType === 'weekly' && d.getDay() === schedule.day_of_week) ||
        (repetitionType === 'daily')
      ) {
        const courseObj = {
          schedule_id: schedule.id,
          class_id: schedule.class_id,
          trainer_id: schedule.trainer_id,
          course_date: d.toISOString().split('T')[0],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          max_participants: maxParticipants,
          is_active: true,
          status: 'scheduled',
        };
        coursesToInsert.push(courseObj);
        generatedDates.push(courseObj.course_date);
      }
    }
    console.log('Generated recurring course dates:', generatedDates);
  }

  console.log('Final coursesToInsert:', coursesToInsert);

  if (coursesToInsert.length === 0) {
    console.error('No courses to insert for schedule:', schedule);
    return NextResponse.json({ error: 'No courses to insert' }, { status: 400 });
  }

  const { error: insertError } = await supabaseServer()
    .from('courses')
    .insert(coursesToInsert);
  if (insertError) {
    console.error('Failed to insert courses:', insertError);
    return NextResponse.json({ error: 'Failed to insert courses', details: insertError }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: coursesToInsert.length });
} 