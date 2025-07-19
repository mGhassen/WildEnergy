import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    console.log(`[TEST] Testing auto mark-absent for date: ${currentDate}, time: ${currentTime}`);

    // First, let's see what registrations would be affected
    const { data: registrationsToCheck, error: fetchError } = await supabaseServer
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
      console.error('[TEST] Error fetching registrations:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    console.log(`[TEST] Found ${registrationsToCheck?.length || 0} registered classes to check`);

    const registrationsToUpdate: any[] = [];
    const registrationsChecked: any[] = [];

    // Check each registration
    for (const registration of registrationsToCheck || []) {
      if (!registration.course) continue;

      const courseDate = registration.course.course_date;
      const courseEndTime = registration.course.end_time;

      // Check if course has finished
      const isPastDate = courseDate < currentDate;
      const isTodayButEnded = courseDate === currentDate && courseEndTime < currentTime;

      registrationsChecked.push({
        id: registration.id,
        courseDate,
        courseEndTime,
        isPastDate,
        isTodayButEnded,
        shouldBeAbsent: isPastDate || isTodayButEnded
      });

      if (isPastDate || isTodayButEnded) {
        // Check if there's no check-in for this registration
        const { data: checkin, error: checkinError } = await supabaseServer
          .from('checkins')
          .select('id')
          .eq('registration_id', registration.id)
          .single();

        if (checkinError && checkinError.code === 'PGRST116') {
          // No check-in found, mark as absent
          registrationsToUpdate.push({
            id: registration.id,
            courseDate,
            courseEndTime,
            reason: 'No check-in found'
          });
        } else if (checkinError) {
          console.error(`[TEST] Error checking check-in for registration ${registration.id}:`, checkinError);
        }
      }
    }

    console.log(`[TEST] Found ${registrationsToUpdate.length} registrations that should be marked as absent`);

    if (registrationsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No registrations need to be marked as absent',
        updatedCount: 0,
        registrationsChecked,
        timestamp: now.toISOString()
      });
    }

    // Update registrations to 'absent' status
    const registrationIds = registrationsToUpdate.map(r => r.id);
    const { data: updatedRegistrations, error: updateError } = await supabaseServer
      .from('class_registrations')
      .update({ status: 'absent' })
      .in('id', registrationIds)
      .select('id, status');

    if (updateError) {
      console.error('[TEST] Error updating registrations to absent:', updateError);
      return NextResponse.json({ error: 'Failed to update registrations' }, { status: 500 });
    }

    console.log(`[TEST] Successfully marked ${updatedRegistrations?.length || 0} registrations as absent`);

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedRegistrations?.length || 0} registrations as absent`,
      updatedCount: updatedRegistrations?.length || 0,
      updatedRegistrations: updatedRegistrations,
      registrationsChecked,
      registrationsToUpdate,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for easier testing
export async function GET(req: NextRequest) {
  return POST(req);
} 