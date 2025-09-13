import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify user (member or admin)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    // Fetch all courses with related class, trainer, and schedule data for comparison
    const { data: courses, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(
          id, 
          name, 
          description, 
          category_id, 
          duration, 
          max_capacity,
          category:categories(id, name, color)
        ),
        trainer:trainers(
          id,
          account_id,
          specialization,
          experience_years,
          bio,
          certification,
          status
        ),
        schedule:schedules(
          id,
          class_id,
          trainer_id,
          day_of_week,
          start_time,
          end_time,
          max_participants,
          repetition_type,
          schedule_date,
          is_active
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Process courses to add comparison data with schedule
    const processedCourses = (courses || []).map(course => {
      const schedule = course.schedule;
      
      // Debug logging to understand the data structure
      console.log('Course data:', {
        id: course.id,
        trainer_id: course.trainer_id,
        start_time: course.start_time,
        end_time: course.end_time,
        max_participants: course.max_participants
      });
      
      console.log('Schedule data:', schedule ? {
        id: schedule.id,
        trainer_id: schedule.trainer_id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        max_participants: schedule.max_participants
      } : 'No schedule');
      
      const isEdited = schedule ? (
        course.trainer_id !== schedule.trainer_id ||
        course.start_time !== schedule.start_time ||
        course.end_time !== schedule.end_time ||
        course.max_participants !== schedule.max_participants
      ) : false;
      
      console.log('Is edited:', isEdited);

      const differences = schedule ? {
        trainer: course.trainer_id !== schedule.trainer_id ? {
          original: schedule.trainer_id,
          current: course.trainer_id
        } : null,
        startTime: course.start_time !== schedule.start_time ? {
          original: schedule.start_time,
          current: course.start_time
        } : null,
        endTime: course.end_time !== schedule.end_time ? {
          original: schedule.end_time,
          current: course.end_time
        } : null,
        maxParticipants: course.max_participants !== schedule.max_participants ? {
          original: schedule.max_participants,
          current: course.max_participants
        } : null
      } : null;

      return {
        ...course,
        isEdited,
        differences
      };
    });

    // Return empty array if no courses found, instead of undefined
    return NextResponse.json(processedCourses);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
    const courseData = await req.json();
    const { data: course, error } = await supabaseServer()
      .from('courses')
      .insert(courseData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
    }
    return NextResponse.json({ success: true, course });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
} 