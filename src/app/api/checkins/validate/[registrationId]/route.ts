import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return userProfile;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ registrationId: string }> }
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

    const { registrationId } = await context.params;
    const registrationIdNum = parseInt(registrationId);
    if (!registrationId || isNaN(registrationIdNum)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    // Get the registration details - allow both 'registered' and 'absent' statuses
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
      .in('status', ['registered', 'absent'])
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Registration not found or not valid for check-in' }, { status: 404 });
    }

    // Check if already checked in
    const { data: existingCheckin, error: checkinError } = await supabaseServer()
      .from('checkins')
      .select('id')
      .eq('registration_id', registrationId)
      .single();

    if (checkinError && checkinError.code !== 'PGRST116') {
      console.error('Error checking existing checkin:', checkinError);
      return NextResponse.json({ error: 'Failed to check existing check-in status' }, { status: 500 });
    }

    if (existingCheckin) {
      return NextResponse.json({ error: 'Member is already checked in' }, { status: 400 });
    }

    console.log(`Updating registration ${registrationId} from status '${registration.status}' to 'attended'`);
    
    // Update registration status to 'attended' and create check-in record
    const { data: updatedRegistration, error: updateError } = await supabaseServer()
      .from('class_registrations')
      .update({ status: 'attended' })
      .eq('id', registrationIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating registration status:', updateError);
      return NextResponse.json({ error: 'Failed to update registration status' }, { status: 500 });
    }

    console.log(`Successfully updated registration ${registrationId} to status: ${updatedRegistration?.status}`);

    // Create the check-in record
    const { data: checkin, error: createError } = await supabaseServer()
      .from('checkins')
      .insert({
        registration_id: registrationId,
        user_id: registration.user_id,
        checkin_time: new Date().toISOString(),
        session_consumed: true,
        notes: 'Validated by admin'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating checkin:', createError);
      return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkin: {
        id: checkin.id,
        registrationId: checkin.registration_id,
        userId: checkin.user_id,
        checkinTime: checkin.checkin_time,
        sessionConsumed: checkin.session_consumed,
        notes: checkin.notes
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
    console.error('Validate checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 