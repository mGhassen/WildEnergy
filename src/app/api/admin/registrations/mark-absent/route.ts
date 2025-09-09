import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin access
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    console.log(`Marking absent registrations for date: ${currentDate}, time: ${currentTime}`);

    // Find registrations that are:
    // 1. Status is 'registered'
    // 2. Course date is in the past OR (course date is today AND course end time has passed)
    // 3. No check-in record exists
    const { data: registrationsToMarkAbsent, error: fetchError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        user_id,
        course_id,
        status,
        course:courses(id, course_date, end_time)
      `)
      .eq('status', 'registered');

    if (fetchError) {
      console.error('Error fetching registrations:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    console.log(`Found ${registrationsToMarkAbsent?.length || 0} registered classes to check`);

    const registrationsToUpdate: number[] = [];

    // Filter registrations that should be marked as absent
    for (const registration of registrationsToMarkAbsent || []) {
      if (!registration.course) continue;

      // Handle both array and single object cases
      const courseObj = Array.isArray(registration.course) ? registration.course[0] : registration.course;
      if (!courseObj) continue;

      const courseDate = courseObj.course_date;
      const courseEndTime = courseObj.end_time;

      // Check if course is in the past
      const isPastDate = courseDate < currentDate;
      const isTodayButEnded = courseDate === currentDate && courseEndTime < currentTime;

      if (isPastDate || isTodayButEnded) {
        // Check if there's no check-in for this registration
        const { data: checkin, error: checkinError } = await supabaseServer()
          .from('checkins')
          .select('id')
          .eq('registration_id', registration.id)
          .single();

        if (checkinError && checkinError.code === 'PGRST116') {
          // No check-in found, mark as absent
          registrationsToUpdate.push(registration.id);
        } else if (checkinError) {
          console.error(`Error checking check-in for registration ${registration.id}:`, checkinError);
        }
      }
    }

    console.log(`Found ${registrationsToUpdate.length} registrations to mark as absent`);

    if (registrationsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No registrations need to be marked as absent',
        updatedCount: 0
      });
    }

    // Update all registrations to 'absent' status
    const { data: updatedRegistrations, error: updateError } = await supabaseServer()
      .from('class_registrations')
      .update({ status: 'absent' })
      .in('id', registrationsToUpdate)
      .select('id, status');

    if (updateError) {
      console.error('Error updating registrations to absent:', updateError);
      return NextResponse.json({ error: 'Failed to update registrations' }, { status: 500 });
    }

    console.log(`Successfully marked ${updatedRegistrations?.length || 0} registrations as absent`);

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedRegistrations?.length || 0} registrations as absent`,
      updatedCount: updatedRegistrations?.length || 0,
      updatedRegistrations: updatedRegistrations
    });

  } catch (error) {
    console.error('Mark absent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 