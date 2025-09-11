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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const { id: registrationId } = await context.params;
    const registrationIdNum = parseInt(registrationId);
    if (!registrationId || isNaN(registrationIdNum)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    // Get the registration details - allow both 'registered' and 'attended' statuses
    const { data: registration, error: registrationError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        member:users(id, first_name, last_name, email),
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(name)
        )
      `)
      .eq('id', registrationIdNum)
      .in('status', ['registered', 'attended'])
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Registration not found or not valid for check-out' }, { status: 404 });
    }

    // Check if there's an existing check-in to remove
    const { data: existingCheckin, error: checkinError } = await supabaseServer()
      .from('checkins')
      .select('id, checkin_time, session_consumed')
      .eq('registration_id', registrationId)
      .single();

    if (checkinError && checkinError.code !== 'PGRST116') {
      console.error('Error checking existing checkin:', checkinError);
      return NextResponse.json({ error: 'Failed to check existing check-in status' }, { status: 500 });
    }

    if (!existingCheckin) {
      return NextResponse.json({ error: 'No check-in found to check out' }, { status: 404 });
    }

    // Delete the check-in record
    const { error: deleteError } = await supabaseServer()
      .from('checkins')
      .delete()
      .eq('id', existingCheckin.id);

    if (deleteError) {
      console.error('Error deleting checkin:', deleteError);
      return NextResponse.json({ error: 'Failed to check out member' }, { status: 500 });
    }

    // Determine the appropriate status based on whether the class has finished
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    
    const courseDate = registration.course.course_date;
    const courseEndTime = registration.course.end_time;
    
    // Check if course has finished
    const isPastDate = courseDate < currentDate;
    const isTodayButEnded = courseDate === currentDate && courseEndTime < currentTime;
    const hasFinished = isPastDate || isTodayButEnded;
    
    // Set status based on whether class has finished
    const newStatus = hasFinished ? 'absent' : 'registered';
    
    console.log(`[CHECK-OUT] Registration ${registrationId}: Course finished: ${hasFinished}, Setting status to: ${newStatus}`);
    console.log(`[CHECK-OUT] Course date: ${courseDate}, end time: ${courseEndTime}, Current: ${currentDate} ${currentTime}`);

    // Update registration status based on class timing
    const { data: updatedRegistration, error: updateError } = await supabaseServer()
      .from('class_registrations')
      .update({ status: newStatus })
      .eq('id', registrationIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating registration status:', updateError);
      return NextResponse.json({ error: 'Failed to update registration status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Member checked out successfully. Registration status set to '${newStatus}'`,
      removedCheckin: {
        id: existingCheckin.id,
        registrationId: registrationId,
        checkinTime: existingCheckin.checkin_time,
        sessionConsumed: existingCheckin.session_consumed
      },
      registration: {
        id: updatedRegistration.id,
        status: updatedRegistration.status,
        newStatus: newStatus,
        courseFinished: hasFinished
      },
      member: {
        id: registration.member.id,
        firstName: registration.member.first_name,
        lastName: registration.member.last_name,
        email: registration.member.email
      },
      course: {
        id: registration.course.id,
        courseDate: registration.course.course_date,
        startTime: registration.course.start_time,
        endTime: registration.course.end_time,
        className: registration.course.class.name
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
