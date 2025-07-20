import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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

    // Verify user is a member (not admin)
    const { data: userData } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access not allowed' }, { status: 403 });
    }

    // Get today's date for filtering
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch courses following the same structure as admin but with member filtering
    const { data: courses, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(id, name, description, category_id, duration, max_capacity, difficulty, category:categories(id, name)),
        trainer:trainers(
          id,
          user_id,
          specialization,
          experience_years,
          bio,
          certification,
          status,
          user:users(id, first_name, last_name, email)
        )
      `)
      .eq('is_active', true) // Only active courses
      .eq('status', 'scheduled') // Only scheduled courses
      .gte('course_date', todayString) // Only future courses
      .order('course_date', { ascending: true }) // Order by date
      .order('start_time', { ascending: true }); // Then by time

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    console.log('Raw courses from database:', courses?.length);

    // Transform the data to match the member page expectations
    const transformedCourses = (courses || []).map(course => {
      return {
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
          user: {
            first_name: course.trainer?.user?.first_name,
            last_name: course.trainer?.user?.last_name
          }
        },
        courseDate: course.course_date,
        startTime: course.start_time,
        endTime: course.end_time,
        isActive: course.is_active,
        scheduleId: course.schedule_id
      };
    });

    console.log('Transformed courses:', transformedCourses.length);

    return NextResponse.json(transformedCourses);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 