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

    // Verify admin access
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { courseId, memberIds } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'Member IDs array is required' }, { status: 400 });
    }

    console.log('Admin registration attempt:', { courseId, memberIds });

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

    // Check if course has enough capacity
    const currentRegistered = course.current_participants || 0;
    if (currentRegistered + memberIds.length > course.max_participants) {
      return NextResponse.json({ 
        error: 'Course capacity exceeded', 
        details: `Course can only accommodate ${course.max_participants - currentRegistered} more members, but ${memberIds.length} were requested.`
      }, { status: 400 });
    }

    // Get all members to validate they exist and are active
    const { data: members, error: membersError } = await supabaseServer()
      .from('user_profiles')
      .select('id, first_name, last_name, email, status, is_member')
      .in('id', memberIds)
      .eq('is_member', true)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch member information' }, { status: 500 });
    }

    if (!members || members.length !== memberIds.length) {
      return NextResponse.json({ error: 'Some members not found or not eligible for registration' }, { status: 400 });
    }

    // Check existing registrations for these members
    const { data: existingRegistrations, error: existingError } = await supabaseServer()
      .from('class_registrations')
      .select('user_id, status')
      .eq('course_id', courseId)
      .in('user_id', memberIds)
      .eq('status', 'registered');

    if (existingError) {
      console.error('Error checking existing registrations:', existingError);
      return NextResponse.json({ error: 'Failed to check existing registrations' }, { status: 500 });
    }

    const alreadyRegistered = existingRegistrations?.map(r => r.member_id) || [];
    const newMembers = memberIds.filter(id => !alreadyRegistered.includes(id));

    if (newMembers.length === 0) {
      return NextResponse.json({ error: 'All selected members are already registered for this course' }, { status: 400 });
    }

    // Check for overlapping courses for each member
    const overlapResults = [];
    for (const memberId of newMembers) {
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
        .eq('user_id', memberId)
        .eq('status', 'registered')
        .neq('course_id', courseId);

      if (overlapError) {
        console.error('Error checking overlapping courses for member:', memberId, overlapError);
        continue;
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
        const member = members.find(m => m.id === memberId);
        overlapResults.push({
          memberId,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
          overlappingCourses: overlapping.map(reg => {
            const existingCourse = reg.course as any;
            return {
              courseId: existingCourse.id,
              courseName: existingCourse.class.name,
              date: existingCourse.course_date,
              startTime: existingCourse.start_time,
              endTime: existingCourse.end_time,
              trainer: `${existingCourse.trainer.user.first_name} ${existingCourse.trainer.user.last_name}`
            };
          })
        });
      }
    }

    // Check subscriptions for each member
    const subscriptionResults = [];
    for (const memberId of newMembers) {
      const { data: activeSubscription, error: subscriptionError } = await supabaseServer()
        .from('subscriptions')
        .select('id, sessions_remaining')
        .eq('user_id', memberId)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error checking subscription for member:', memberId, subscriptionError);
        continue;
      }

      if (!activeSubscription) {
        const member = members.find(m => m.id === memberId);
        subscriptionResults.push({
          memberId,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
          error: 'No active subscription with sessions remaining'
        });
      }
    }

    // If there are any issues, return them
    if (overlapResults.length > 0 || subscriptionResults.length > 0) {
      return NextResponse.json({
        error: 'Some members cannot be registered',
        overlaps: overlapResults,
        subscriptionIssues: subscriptionResults,
        message: `${overlapResults.length} member(s) have time conflicts, ${subscriptionResults.length} member(s) have subscription issues.`
      }, { status: 409 });
    }

    // Register all eligible members
    const registrationResults = [];
    const errors = [];

    for (const memberId of newMembers) {
      try {
        // Get member's active subscription
        const { data: activeSubscription } = await supabaseServer()
          .from('subscriptions')
          .select('id, sessions_remaining')
          .eq('user_id', memberId)
          .eq('status', 'active')
          .gt('sessions_remaining', 0)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();

        if (!activeSubscription) {
          const member = members.find(m => m.id === memberId);
          errors.push({
            memberId,
            memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
            error: 'No active subscription with sessions remaining'
          });
          continue;
        }

        // Use the stored procedure to handle registration with session deduction
        const rpcResult: any = await supabaseServer()
          .rpc('create_registration_with_updates', {
            p_user_id: memberId,
            p_course_id: courseId,
            p_current_participants: course.current_participants + registrationResults.length,
            p_subscription_id: activeSubscription.id
          });
        
        const result: any = rpcResult.data;
        const procedureError: any = rpcResult.error;

        if (procedureError) {
          console.error('Registration procedure error for member:', memberId, procedureError);
          const member = members.find(m => m.id === memberId);
          errors.push({
            memberId,
            memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
            error: 'Failed to create registration'
          });
          continue;
        }

        const member = members.find(m => m.id === memberId);
        registrationResults.push({
          memberId,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
          registration: result
        });
      } catch (error) {
        console.error('Error registering member:', memberId, error);
        const member = members.find(m => m.id === memberId);
        errors.push({
          memberId,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
          error: 'Registration failed'
        });
      }
    }

    // Update course participant count
    if (registrationResults.length > 0) {
      const newParticipantCount = currentRegistered + registrationResults.length;
      await supabaseServer()
        .from('courses')
        .update({ current_participants: newParticipantCount })
        .eq('id', courseId);
    }

    return NextResponse.json({
      success: true,
      registered: registrationResults,
      errors,
      alreadyRegistered: alreadyRegistered.map(id => {
        const member = members.find(m => m.id === id);
        return {
          memberId: id,
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown'
        };
      }),
      summary: {
        total: memberIds.length,
        registered: registrationResults.length,
        errors: errors.length,
        alreadyRegistered: alreadyRegistered.length
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json({ error: 'Failed to process registrations' }, { status: 500 });
  }
} 