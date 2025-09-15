import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) return null;
  
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, is_admin, accessible_portals')
    .eq('account_id', user.id)
    .single();

  return userProfile;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check if user is a member
    if (!userProfile.member_id) {
      return NextResponse.json({ error: 'Member access required' }, { status: 403 });
    }

    const { id } = await params;
    const registrationId = parseInt(id);
    
    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    console.log('Cancel registration attempt:', { memberId: userProfile.member_id, registrationId });

    // Get the registration to check if it exists and belongs to the member
    const { data: registration, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        course:courses(
          id,
          course_date,
          start_time,
          end_time
        )
      `)
      .eq('id', registrationId)
      .eq('member_id', userProfile.member_id)
      .eq('status', 'registered')
      .single();

    if (regError || !registration) {
      console.error('Registration not found or not in registered status:', regError);
      return NextResponse.json({ error: 'Registration not found or cannot be cancelled' }, { status: 404 });
    }

    // Check if course is in the past
    const courseDateTime = new Date(`${registration.course.course_date}T${registration.course.start_time}`);
    const now = new Date();
    
    if (now >= courseDateTime) {
      return NextResponse.json({ error: 'Cannot cancel registration for a course that has already started' }, { status: 400 });
    }

    // Check if within 24 hours of course start
    const cutoffTime = new Date(courseDateTime.getTime() - (24 * 60 * 60 * 1000));
    const isWithin24Hours = now >= cutoffTime;

    // Use the stored procedure to handle cancellation with session refund
    const { data: result, error: procedureError } = await supabaseServer()
      .rpc('cancel_registration_with_updates', {
        p_registration_id: registrationId,
        p_user_id: registration.member_id,
        p_is_within_24_hours: isWithin24Hours,
        p_subscription_id: registration.subscription_id,
        p_force_refund: undefined // Members cannot override refund logic
      });

    if (procedureError) {
      console.error('Cancellation procedure error:', procedureError);
      return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 });
    }

    console.log('Cancellation successful:', result);
    return NextResponse.json({ 
      success: true, 
      isWithin24Hours,
      sessionRefunded: result?.session_refunded,
      message: result?.session_refunded === false
        ? 'Registration cancelled. Session forfeited due to late cancellation.' 
        : 'Registration cancelled. Session refunded to your account.'
    });

  } catch (error) {
    console.error('POST cancel registration error:', error);
    return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 });
  }
}
