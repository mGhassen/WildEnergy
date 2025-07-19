import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return userProfile;
}



export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    if (userProfile.is_admin) {
      // Admin: return all registrations
      const { data: registrations, error } = await supabaseServer
        .from('class_registrations')
        .select(`
          *,
          course:courses(
            id,
            course_date,
            start_time,
            end_time,
            class:classes(name, description, category:categories(name)),
            trainer:trainers(user:users(first_name, last_name))
          )
        `);
      if (error) {
        console.error('Admin registrations error:', error);
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      return NextResponse.json(registrations);
    } else {
      // User: return own registrations
      const { data: registrations, error } = await supabaseServer
        .from('class_registrations')
        .select(`
          *,
          course:courses(
            id,
            course_date,
            start_time,
            end_time,
            class:classes(name, description, category:categories(name)),
            trainer:trainers(user:users(first_name, last_name))
          )
        `)
        .eq('user_id', userProfile.id);
      if (error) {
        console.error('User registrations error:', error);
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      return NextResponse.json(registrations);
    }
  } catch (error) {
    console.error('GET registrations error:', error);
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
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    console.log('Registration attempt:', { userId: userProfile.id, courseId });

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabaseServer
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('is_active', true)
      .eq('status', 'scheduled')
      .single();

    if (courseError || !course) {
      console.error('Course not found or inactive:', courseError);
      return NextResponse.json({ error: 'Course not found or not available for registration' }, { status: 404 });
    }

    // Check if already registered
    const { data: existing, error: existingError } = await supabaseServer
      .from('class_registrations')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('course_id', courseId)
      .eq('status', 'registered')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing registration:', existingError);
      return NextResponse.json({ error: 'Failed to check registration status' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Already registered for this course' }, { status: 400 });
    }

    // Check for overlapping courses
    const { data: overlappingCourses, error: overlapError } = await supabaseServer
      .from('class_registrations')
      .select(`
        id,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(name),
          trainer:trainers(user:users(first_name, last_name))
        )
      `)
      .eq('user_id', userProfile.id)
      .eq('status', 'registered')
      .neq('course_id', courseId);

    if (overlapError) {
      console.error('Error checking overlapping courses:', overlapError);
      return NextResponse.json({ error: 'Failed to check for overlapping courses' }, { status: 500 });
    }

    // Check for time overlaps
    const overlapping = overlappingCourses?.filter(reg => {
      const existingCourse = reg.course as any;
      if (!existingCourse) return false;

      // Check if courses are on the same date
      if (existingCourse.course_date !== course.course_date) return false;

      // Check for time overlap
      const existingStart = new Date(`2000-01-01T${existingCourse.start_time}`);
      const existingEnd = new Date(`2000-01-01T${existingCourse.end_time}`);
      const newStart = new Date(`2000-01-01T${course.start_time}`);
      const newEnd = new Date(`2000-01-01T${course.end_time}`);

      // Check if times overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (overlapping && overlapping.length > 0) {
      const overlapDetails = overlapping.map(reg => {
        const existingCourse = reg.course as any;
        return {
          courseId: existingCourse.id,
          courseName: existingCourse.class.name,
          date: existingCourse.course_date,
          startTime: existingCourse.start_time,
          endTime: existingCourse.end_time,
          trainer: `${existingCourse.trainer.user.first_name} ${existingCourse.trainer.user.last_name}`
        };
      });

      return NextResponse.json({
        error: 'Course time conflict detected',
        type: 'OVERLAP',
        overlappingCourses: overlapDetails,
        message: `This course overlaps with ${overlapping.length} other course(s) you're registered for.`
      }, { status: 409 });
    }

    // Check if course is full
    if (course.current_participants >= course.max_participants) {
      return NextResponse.json({ error: 'Course is full' }, { status: 400 });
    }

    // Get user's active subscription with sessions remaining
    const { data: activeSubscription, error: subscriptionError } = await supabaseServer
      .from('subscriptions')
      .select('id, sessions_remaining')
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .gt('sessions_remaining', 0)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
    }

    if (!activeSubscription) {
      return NextResponse.json({ error: 'No active subscription with sessions remaining' }, { status: 400 });
    }

    // Use the stored procedure to handle registration with session deduction
    const { data: result, error: procedureError } = await supabaseServer
      .rpc('create_registration_with_updates', {
        p_user_id: userProfile.id,
        p_course_id: courseId,
        p_current_participants: course.current_participants,
        p_subscription_id: activeSubscription.id
      });

    if (procedureError) {
      console.error('Registration procedure error:', procedureError);
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
    }

    console.log('Registration successful:', result);
    return NextResponse.json({ success: true, registration: result });
  } catch (error) {
    console.error('POST registration error:', error);
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
} 