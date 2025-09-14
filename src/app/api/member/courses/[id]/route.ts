import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Verify user profile exists - both members and admins can access member APIs
    const { data: userData, error: userDataError } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', user.email)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // Get today's date for filtering
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch specific course with member filtering
    const { data: course, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(id, name, description, category_id, duration, max_capacity, difficulty, category:categories(id, name, color)),
        trainer:trainers(
          id,
          account_id,
          specialization,
          experience_years,
          bio,
          certification,
          status
        )
      `)
      .eq('id', courseId)
      .eq('is_active', true) // Only active courses
      .eq('status', 'scheduled') // Only scheduled courses
      .gte('course_date', todayString) // Only future courses
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch trainer details
    let trainerDetails = {
      first_name: 'Unknown',
      last_name: 'Trainer'
    };
    
    if (course.trainer?.account_id) {
      const { data: trainer } = await supabaseServer()
        .from('user_profiles')
        .select('account_id, first_name, last_name')
        .eq('account_id', course.trainer.account_id)
        .single();
      
      if (trainer) {
        trainerDetails = trainer;
      }
    }

    // Transform the data to match the member page expectations
    const transformedCourse = {
      id: course.id,
      class: {
        id: course.class?.id,
        name: course.class?.name,
        description: course.class?.description,
        category: course.class?.category,
        difficulty: course.class?.difficulty,
        maxCapacity: course.class?.max_capacity,
        duration: course.class?.duration
      },
      trainer: {
        id: course.trainer?.id,
        user: trainerDetails
      },
      courseDate: course.course_date,
      startTime: course.start_time,
      endTime: course.end_time,
      isActive: course.is_active,
      scheduleId: course.schedule_id
    };

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
