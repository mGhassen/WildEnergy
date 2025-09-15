import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('*')
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
    if (userProfile.is_admin) {
      // Admin: return all registrations
      const { data: registrations, error } = await supabaseServer()
        .from('class_registrations')
        .select(`
          *,
          course:courses(
            id,
            course_date,
            start_time,
            end_time,
            schedule_id,
            class:classes(name, description, category:categories(name)),
            trainer:trainers(account_id, specialization, experience_years)
          )
        `);
      if (error) {
        console.error('Admin registrations error:', error);
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      console.log('Admin registrations fetched:', registrations?.length || 0, 'registrations');
      
      // Fetch member and trainer details separately
      const memberIds = registrations?.map(r => r.member_id).filter(Boolean) || [];
      const trainerAccountIds = registrations?.map(r => r.course?.trainer?.account_id).filter(Boolean) || [];
      
      let memberDetails: Record<string, any> = {};
      let trainerDetails: Record<string, any> = {};
      
      if (memberIds.length > 0) {
        const { data: members } = await supabaseServer()
          .from('user_profiles')
          .select('member_id, first_name, last_name, email')
          .in('member_id', memberIds);
        
        if (members) {
          members.forEach(member => {
            memberDetails[member.member_id] = member;
          });
        }
      }
      
      if (trainerAccountIds.length > 0) {
        const { data: trainers } = await supabaseServer()
          .from('user_profiles')
          .select('account_id, first_name, last_name, email')
          .in('account_id', trainerAccountIds);
        
        if (trainers) {
          trainers.forEach(trainer => {
            trainerDetails[trainer.account_id] = trainer;
          });
        }
      }
      
      // Enhance registrations with member and trainer details
      const enhancedRegistrations = registrations?.map(reg => ({
        ...reg,
        member: memberDetails[reg.member_id] || null,
        course: reg.course ? {
          ...reg.course,
          trainer: reg.course.trainer ? {
            ...reg.course.trainer,
            first_name: trainerDetails[reg.course.trainer.account_id]?.first_name || '',
            last_name: trainerDetails[reg.course.trainer.account_id]?.last_name || '',
            email: trainerDetails[reg.course.trainer.account_id]?.email || ''
          } : null
        } : null
      })) || [];
      
      return NextResponse.json(enhancedRegistrations);
    } else {
      // User: return own registrations
      const { data: registrations, error } = await supabaseServer()
        .from('class_registrations')
        .select(`
          *,
          course:courses(
            id,
            course_date,
            start_time,
            end_time,
            class:classes(name, description, category:categories(name)),
            trainer:trainers(account_id, specialization, experience_years)
          )
        `)
        .eq('member_id', userProfile.member_id);
      if (error) {
        console.error('User registrations error:', error);
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      
      // Fetch trainer details separately for user registrations
      const trainerAccountIds = registrations?.map(r => r.course?.trainer?.account_id).filter(Boolean) || [];
      let trainerDetails: Record<string, any> = {};
      
      if (trainerAccountIds.length > 0) {
        const { data: trainers } = await supabaseServer()
          .from('user_profiles')
          .select('account_id, first_name, last_name, email')
          .in('account_id', trainerAccountIds);
        
        if (trainers) {
          trainers.forEach(trainer => {
            trainerDetails[trainer.account_id] = trainer;
          });
        }
      }
      
      // Enhance registrations with trainer details
      const enhancedRegistrations = registrations?.map(reg => ({
        ...reg,
        course: reg.course ? {
          ...reg.course,
          trainer: reg.course.trainer ? {
            ...reg.course.trainer,
            first_name: trainerDetails[reg.course.trainer.account_id]?.first_name || '',
            last_name: trainerDetails[reg.course.trainer.account_id]?.last_name || '',
            email: trainerDetails[reg.course.trainer.account_id]?.email || ''
          } : null
        } : null
      })) || [];
      
      return NextResponse.json(enhancedRegistrations);
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
      .eq('member_id', userProfile.member_id)
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

    // Check if user can register for this course (group session check)
    const { data: canRegister, error: canRegisterError } = await supabaseServer()
      .rpc('can_register_for_course', {
        p_user_id: userProfile.member_id,
        p_course_id: courseId
      });

    if (canRegisterError) {
      console.error('Error checking group session availability:', canRegisterError);
      return NextResponse.json({ error: 'Failed to check session availability' }, { status: 500 });
    }

    if (!canRegister.can_register) {
      return NextResponse.json({ 
        error: canRegister.error || 'Cannot register for this course',
        type: 'GROUP_SESSION_UNAVAILABLE',
        groupId: canRegister.group_id,
        sessionsRemaining: canRegister.sessions_remaining
      }, { status: 400 });
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

    // Use the admin-specific stored procedure to handle registration with session deduction
    const { data: result, error: procedureError } = await supabaseServer()
      .rpc('create_admin_registration_with_updates', {
        p_user_id: userProfile.member_id,
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