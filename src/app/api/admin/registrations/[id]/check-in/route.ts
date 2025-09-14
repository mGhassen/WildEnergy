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
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await context.params;
    console.log('Check-in API - Registration ID received:', registrationId);
    console.log('Check-in API - URL:', req.url);
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('Check-in API - No token provided');
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

    const registrationIdNum = parseInt(registrationId);
    if (!registrationId || isNaN(registrationIdNum)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    // Get the registration details - allow both 'registered' and 'absent' statuses
    const { data: registration, error: registrationError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        members (
          id,
          status,
          account_id,
          profiles (
            first_name,
            last_name,
            phone
          ),
          accounts (
            email
          )
        ),
        courses (
          id,
          course_date,
          start_time,
          end_time,
          class_id,
          classes (
            name
          )
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

    console.log(`Checking in registration ${registrationId} from status '${registration.status}' to 'attended'`);
    
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
        member_id: registration.member_id,
        checkin_time: new Date().toISOString(),
        session_consumed: true,
        notes: 'Checked in by admin'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating checkin:', createError);
      return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member checked in successfully',
      checkin: {
        id: checkin.id,
        registrationId: checkin.registration_id,
        memberId: checkin.member_id,
        checkinTime: checkin.checkin_time,
        sessionConsumed: checkin.session_consumed,
        notes: checkin.notes
      },
      member: {
        id: registration.members?.id,
        firstName: registration.members?.profiles?.first_name,
        lastName: registration.members?.profiles?.last_name,
        email: registration.members?.accounts?.email
      },
      course: {
        id: registration.courses?.id,
        courseDate: registration.courses?.course_date,
        startTime: registration.courses?.start_time,
        endTime: registration.courses?.end_time,
        className: registration.courses?.classes?.name
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
