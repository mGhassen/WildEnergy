import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    console.log(`[CRON] Marking absent registrations for date: ${currentDate}, time: ${currentTime}`);

    // Find registrations that should be marked as absent:
    // 1. Status is 'registered'
    // 2. Course has finished (past date OR today but end time has passed)
    // 3. No check-in record exists
    const { data: registrationsToMarkAbsent, error: fetchError } = await supabaseServer
      .from('class_registrations')
      .select(`
        id,
        user_id,
        course_id,
        status,
        course:courses(
          id,
          course_date,
          end_time
        )
      `)
      .eq('status', 'registered')
      .not('course_id', 'is', null);

    if (fetchError) {
      console.error('[CRON] Error fetching registrations:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    console.log(`[CRON] Found ${registrationsToMarkAbsent?.length || 0} registered classes to check`);

    const registrationsToUpdate: number[] = [];

    // Filter registrations that should be marked as absent
    for (const registration of registrationsToMarkAbsent || []) {
      if (!registration.course) continue;

      // Handle both array and single object cases
      const courseObj = Array.isArray(registration.course) ? registration.course[0] : registration.course;
      if (!courseObj) continue;

      const courseDate = courseObj.course_date;
      const courseEndTime = courseObj.end_time;

      // Check if course has finished
      const isPastDate = courseDate < currentDate;
      const isTodayButEnded = courseDate === currentDate && courseEndTime < currentTime;

      if (isPastDate || isTodayButEnded) {
        // Check if there's no check-in for this registration
        const { data: checkin, error: checkinError } = await supabaseServer
          .from('checkins')
          .select('id')
          .eq('registration_id', registration.id)
          .single();

        if (checkinError && checkinError.code === 'PGRST116') {
          // No check-in found, mark as absent
          registrationsToUpdate.push(registration.id);
          console.log(`[CRON] Will mark registration ${registration.id} as absent (course finished: ${courseDate} ${courseEndTime})`);
        } else if (checkinError) {
          console.error(`[CRON] Error checking check-in for registration ${registration.id}:`, checkinError);
        }
      }
    }

    console.log(`[CRON] Found ${registrationsToUpdate.length} registrations to mark as absent`);

    if (registrationsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No registrations need to be marked as absent',
        updatedCount: 0,
        timestamp: now.toISOString()
      });
    }

    // Update all registrations to 'absent' status
    const { data: updatedRegistrations, error: updateError } = await supabaseServer
      .from('class_registrations')
      .update({ status: 'absent' })
      .in('id', registrationsToUpdate)
      .select('id, status');

    if (updateError) {
      console.error('[CRON] Error updating registrations to absent:', updateError);
      return NextResponse.json({ error: 'Failed to update registrations' }, { status: 500 });
    }

    console.log(`[CRON] Successfully marked ${updatedRegistrations?.length || 0} registrations as absent`);

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedRegistrations?.length || 0} registrations as absent`,
      updatedCount: updatedRegistrations?.length || 0,
      updatedRegistrations: updatedRegistrations,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('[CRON] Mark absent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 