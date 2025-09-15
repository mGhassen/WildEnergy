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
    
    // Check if schedule has registrations or checkins before allowing edit
    const { data: schedule, error: scheduleError } = await supabaseServer()
      .from('schedules')
      .select(`
        id,
        courses(
          id, 
          class_registrations(
            id,
            status,
            checkins(id)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Count registrations and checkins
    let totalRegistrations = 0;
    let totalCheckins = 0;
    
    schedule.courses?.forEach((course: any) => {
      const registrations = course.class_registrations || [];
      totalRegistrations += registrations.length;
      
      registrations.forEach((reg: any) => {
        const checkins = reg.checkins || [];
        totalCheckins += checkins.length;
      });
    });

    // Check if schedule can be edited (no registrations or attendance)
    if (totalRegistrations > 0 || totalCheckins > 0) {
      return NextResponse.json({ 
        error: 'Cannot edit schedule with existing registrations or attendance',
        message: 'This schedule has members registered or who have attended courses. Please cancel all registrations first.',
        details: {
          totalRegistrations,
          totalCheckins
        }
      }, { status: 400 });
    }
    
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

    // If schedule is being set to inactive, update all related courses to inactive
    if (body.is_active === false) {
      const { error: updateCoursesError } = await supabaseServer()
        .from('courses')
        .update({ is_active: false })
        .eq('schedule_id', id);

      if (updateCoursesError) {
        console.error('Error updating courses to inactive:', updateCoursesError);
        return NextResponse.json({ 
          error: 'Schedule updated but failed to deactivate related courses', 
          details: updateCoursesError.message 
        }, { status: 500 });
      }
    }

    // Only regenerate courses if the schedule is active
    if (body.is_active === true) {
      try {
        // First, delete all existing courses for this schedule
        const { error: deleteCoursesError } = await supabaseServer()
          .from('courses')
          .delete()
          .eq('schedule_id', id);

        if (deleteCoursesError) {
          console.error('Error deleting existing courses:', deleteCoursesError);
          return NextResponse.json({ 
            error: 'Failed to delete existing courses', 
            details: deleteCoursesError.message 
          }, { status: 500 });
        }

      // Get the updated schedule with class details for course generation
      const { data: scheduleForGeneration, error: scheduleError } = await supabaseServer()
        .from('schedules')
        .select(`
          id,
          class_id,
          trainer_id,
          day_of_week,
          start_time,
          end_time,
          max_participants,
          repetition_type,
          schedule_date,
          start_date,
          end_date,
          is_active,
          classes!inner(id, max_capacity)
        `)
        .eq('id', id)
        .single();

      if (scheduleError || !scheduleForGeneration) {
        console.error('Error fetching updated schedule:', scheduleError);
        return NextResponse.json({ 
          error: 'Failed to fetch updated schedule', 
          details: scheduleError?.message 
        }, { status: 500 });
      }

      // Generate new courses based on updated schedule
      const coursesToInsert = [];
      const repetitionType = scheduleForGeneration.repetition_type || 'once';
      // Always use schedule's max_participants if it exists, otherwise fall back to class capacity
      const maxParticipants = scheduleForGeneration.max_participants !== null && scheduleForGeneration.max_participants !== undefined 
        ? scheduleForGeneration.max_participants 
        : ((scheduleForGeneration.classes as any)?.max_capacity || 10);

      if (repetitionType === 'once') {
        // One-time event
        if (!scheduleForGeneration.schedule_date) {
          return NextResponse.json({ 
            error: 'No schedule_date for one-time event' 
          }, { status: 400 });
        }
        coursesToInsert.push({
          schedule_id: scheduleForGeneration.id,
          class_id: scheduleForGeneration.class_id,
          trainer_id: scheduleForGeneration.trainer_id,
          course_date: scheduleForGeneration.schedule_date.split('T')[0],
          start_time: scheduleForGeneration.start_time,
          end_time: scheduleForGeneration.end_time,
          max_participants: maxParticipants,
          is_active: true,
          status: 'scheduled',
        });
      } else {
        // Recurring event
        const startDate = scheduleForGeneration.start_date ? scheduleForGeneration.start_date.split('T')[0] : undefined;
        const endDate = scheduleForGeneration.end_date ? scheduleForGeneration.end_date.split('T')[0] : undefined;
        
        if (!startDate || !endDate) {
          return NextResponse.json({ 
            error: 'Missing start_date or end_date for recurring event' 
          }, { status: 400 });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (
            (repetitionType === 'weekly' && d.getDay() === scheduleForGeneration.day_of_week) ||
            (repetitionType === 'daily')
          ) {
            coursesToInsert.push({
              schedule_id: scheduleForGeneration.id,
              class_id: scheduleForGeneration.class_id,
              trainer_id: scheduleForGeneration.trainer_id,
              course_date: d.toISOString().split('T')[0],
              start_time: scheduleForGeneration.start_time,
              end_time: scheduleForGeneration.end_time,
              max_participants: maxParticipants,
              is_active: true,
              status: 'scheduled',
            });
          }
        }
      }

      // Insert new courses
      if (coursesToInsert.length > 0) {
        const { error: insertCoursesError } = await supabaseServer()
          .from('courses')
          .insert(coursesToInsert);

        if (insertCoursesError) {
          console.error('Error inserting new courses:', insertCoursesError);
          return NextResponse.json({ 
            error: 'Failed to generate new courses', 
            details: insertCoursesError.message 
          }, { status: 500 });
        }
      }

        console.log(`Successfully regenerated ${coursesToInsert.length} courses for schedule ${id}`);
        
        return NextResponse.json({
          ...updatedSchedule,
          regeneratedCourses: coursesToInsert.length,
          message: `Schedule updated and ${coursesToInsert.length} courses regenerated successfully`
        });

      } catch (courseError) {
        console.error('Error during course regeneration:', courseError);
        return NextResponse.json({ 
          error: 'Schedule updated but failed to regenerate courses', 
          details: String(courseError) 
        }, { status: 500 });
      }
    } else {
      // Schedule is inactive, return success without regenerating courses
      return NextResponse.json({
        ...updatedSchedule,
        regeneratedCourses: 0,
        message: 'Schedule updated and set to inactive. Related courses have been deactivated.'
      });
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
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('trainer_id', schedule.trainer_id)
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
  // Always use schedule's max_participants if it exists, otherwise fall back to class capacity
  const maxParticipants = schedule.max_participants !== null && schedule.max_participants !== undefined 
    ? schedule.max_participants 
    : (classData?.max_capacity || 10);

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

  console.log('📝 Final coursesToInsert:', coursesToInsert.length, 'courses');

  if (coursesToInsert.length === 0) {
    console.error('❌ No courses to insert for schedule:', schedule);
    return NextResponse.json({ error: 'No courses to insert' }, { status: 400 });
  }

  console.log('💾 Inserting courses into database...');
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