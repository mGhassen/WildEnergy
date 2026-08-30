import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { resolveGroupForClass } from '@/lib/resolve-class-group';
import {
  batchResolveTrainerProfiles,
  enrichTrainerWithProfile,
} from '@/lib/resolve-trainer-profile';

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

    // Verify user profile exists - both members and admins can access member APIs
    const { data: userData, error: userDataError } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', user.email)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get today's date for filtering
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch courses following the same structure as admin but with member filtering
    const { data: courses, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(
          *,
          category:categories(
            id, name, color,
            category_groups(group:groups(id, name, color))
          )
        ),
        trainer:trainers(
          id,
          account_id,
          profile_id,
          specialization,
          experience_years,
          bio,
          certification,
          status
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

    const trainerProfiles = await batchResolveTrainerProfiles(
      supabaseServer(),
      (courses || []).map((course) => course.trainer),
    );

    // Transform the data to match the member page expectations
    const transformedCourses = (courses || []).map(course => {
      const group = resolveGroupForClass(course.class);
      const enrichedTrainer = enrichTrainerWithProfile(course.trainer, trainerProfiles);
      return {
        id: course.id,
        class: {
          id: course.class?.id,
          name: course.class?.name,
          description: course.class?.description,
          category: course.class?.category
            ? { ...course.class.category, group }
            : course.class?.category,
          difficulty: course.class?.difficulty,
          maxCapacity: course.class?.max_capacity,
          duration: course.class?.duration
        },
        trainer: {
          id: enrichedTrainer?.id,
          user: {
            first_name: enrichedTrainer?.first_name ?? enrichedTrainer?.member?.first_name ?? null,
            last_name: enrichedTrainer?.last_name ?? enrichedTrainer?.member?.last_name ?? null,
          },
        },
        courseDate: course.course_date,
        startTime: course.start_time,
        endTime: course.end_time,
        isActive: course.is_active,
        scheduleId: course.schedule_id,
        max_participants: course.max_participants,
        current_participants: course.current_participants
      };
    });

    console.log('Transformed courses:', transformedCourses.length);

    return NextResponse.json(transformedCourses);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 