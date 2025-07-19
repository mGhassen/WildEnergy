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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
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

    const resolvedParams = await params;
    const registrationId = parseInt(resolvedParams.registrationId);
    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    // Get the registration details
    const { data: registration, error: registrationError } = await supabaseServer
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
      .eq('id', registrationId)
      .eq('status', 'registered')
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Registration not found or not valid' }, { status: 404 });
    }

    // Check if there's an existing check-in to remove
    const { data: existingCheckin, error: checkinError } = await supabaseServer
      .from('checkins')
      .select('id, checkin_time, session_consumed')
      .eq('registration_id', registrationId)
      .single();

    if (checkinError && checkinError.code !== 'PGRST116') {
      console.error('Error checking existing checkin:', checkinError);
      return NextResponse.json({ error: 'Failed to check existing check-in status' }, { status: 500 });
    }

    if (!existingCheckin) {
      return NextResponse.json({ error: 'No check-in found to unvalidate' }, { status: 404 });
    }

    // Delete the check-in record
    const { error: deleteError } = await supabaseServer
      .from('checkins')
      .delete()
      .eq('id', existingCheckin.id);

    if (deleteError) {
      console.error('Error deleting checkin:', deleteError);
      return NextResponse.json({ error: 'Failed to unvalidate check-in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in unvalidated successfully',
      removedCheckin: {
        id: existingCheckin.id,
        registrationId: registrationId,
        checkinTime: existingCheckin.checkin_time,
        sessionConsumed: existingCheckin.session_consumed
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
    console.error('Unvalidate checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 