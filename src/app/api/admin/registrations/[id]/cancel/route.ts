import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer ()
    .from('user_profiles')
    .select('*')
    .eq('email', user.email)
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

    const { id } = await params;
    const registrationId = parseInt(id);
    
    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    console.log('Cancel registration attempt:', { userId: userProfile.id, registrationId });

    // Get the registration to check if it exists and belongs to the user (admin can cancel any)
    const { data: registration, error: regError } = await supabaseServer ()
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
      .eq('status', 'registered')
      .single();

    if (regError || !registration) {
      console.error('Registration not found or not in registered status:', regError);
      return NextResponse.json({ error: 'Registration not found or cannot be cancelled' }, { status: 404 });
    }

    // Only allow non-admins to cancel their own registrations
    if (!userProfile.is_admin && registration.user_id !== userProfile.id) {
      return NextResponse.json({ error: 'You can only cancel your own registrations' }, { status: 403 });
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

    // Admin can override refund logic
    let refundSession: boolean | undefined = undefined;
    if (userProfile.is_admin) {
      try {
        const body = await req.json();
        if (typeof body.refundSession === 'boolean') {
          refundSession = body.refundSession;
        }
      } catch {}
    }

    // Use the stored procedure to handle cancellation with session refund
    const { data: result, error: procedureError } = await supabaseServer ()
      .rpc('cancel_registration_with_updates', {
        p_registration_id: registrationId,
        p_user_id: registration.user_id,
        p_is_within_24_hours: isWithin24Hours,
        p_subscription_id: registration.subscription_id,
        p_force_refund: refundSession
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