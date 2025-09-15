import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) return null;
  
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, is_admin, accessible_portals')
    .eq('email', user.email)
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

    // Check if user is a member
    if (!userProfile.member_id) {
      return NextResponse.json({ error: 'Member access required' }, { status: 403 });
    }

    // Fetch registrations for the member
    const { data: registrations, error } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(
            id,
            name,
            description,
            category:categories(id, name)
          ),
          trainer:trainers(
            id,
            account_id,
            specialization,
            experience_years
          )
        )
      `)
      .eq('member_id', userProfile.member_id)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    // Fetch trainer details separately
    const trainerAccountIds = registrations?.map(r => r.course?.trainer?.account_id).filter(Boolean) || [];
    let trainerDetails: Record<string, any> = {};
    
    if (trainerAccountIds.length > 0) {
      const { data: trainers } = await supabaseServer()
        .from('user_profiles')
        .select('account_id, first_name, last_name')
        .in('account_id', trainerAccountIds);
      
      if (trainers) {
        trainers.forEach(trainer => {
          trainerDetails[trainer.account_id] = trainer;
        });
      }
    }

    // Transform the data to match the expected interface
    const transformedRegistrations = registrations?.map(reg => ({
      id: reg.id,
      course_id: reg.course_id,
      user_id: reg.member_id,
      status: reg.status,
      registration_date: reg.registration_date,
      qr_code: reg.qr_code,
      notes: reg.notes,
      course: reg.course ? {
        ...reg.course,
        trainer: reg.course.trainer ? {
          id: reg.course.trainer.id,
          user: trainerDetails[reg.course.trainer.account_id] || {
            first_name: 'Unknown',
            last_name: 'Trainer'
          }
        } : null
      } : null
    })) || [];

    return NextResponse.json(transformedRegistrations);
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

    // Check if user is a member
    if (!userProfile.member_id) {
      return NextResponse.json({ error: 'Member access required' }, { status: 403 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    console.log('Member registration attempt:', { memberId: userProfile.member_id, courseId });

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabaseServer()
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
    const { data: existing, error: existingError } = await supabaseServer()
      .from('class_registrations')
      .select('*')
      .eq('member_id', userProfile.member_id)
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
    const { data: overlappingCourses, error: overlapError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        course:courses(
          course_date,
          start_time,
          end_time
        )
      `)
      .eq('member_id', userProfile.member_id)
      .eq('status', 'registered')
      .gte('course.course_date', new Date().toISOString().split('T')[0]);

    if (overlapError) {
      console.error('Error checking overlapping courses:', overlapError);
      return NextResponse.json({ error: 'Failed to check for overlapping courses' }, { status: 500 });
    }

    // Check for time overlaps
    const courseStart = new Date(`${course.course_date}T${course.start_time}`);
    const courseEnd = new Date(`${course.course_date}T${course.end_time}`);

    for (const reg of overlappingCourses || []) {
      const courseData = reg.course as any;
      if (courseData && courseData.course_date && courseData.start_time && courseData.end_time) {
        const regStart = new Date(`${courseData.course_date}T${courseData.start_time}`);
        const regEnd = new Date(`${courseData.course_date}T${courseData.end_time}`);
        
        if ((courseStart < regEnd && courseEnd > regStart)) {
          return NextResponse.json({ 
            error: 'You have a conflicting course registration at this time',
            type: 'OVERLAP',
            conflictingCourse: courseData
          }, { status: 409 });
        }
      }
    }

    // Check course capacity
    if (course.current_participants >= course.max_participants) {
      return NextResponse.json({ error: 'Course is at full capacity' }, { status: 400 });
    }

    // Get user's active subscription
    const { data: activeSubscription, error: subscriptionError } = await supabaseServer()
      .from('subscriptions')
      .select('id')
      .eq('member_id', userProfile.member_id)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
    }

    if (!activeSubscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Use the stored procedure to handle registration with session deduction
    const { data: result, error: procedureError } = await supabaseServer()
      .rpc('create_registration_with_updates', {
        p_member_id: userProfile.member_id,
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