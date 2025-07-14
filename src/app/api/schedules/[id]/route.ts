import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/schedules\/([^/]+)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update schedule by ID
  return NextResponse.json({ message: `Update schedule ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete schedule by ID
  return NextResponse.json({ message: `Delete schedule ${id}` });
}

export async function POST(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) return NextResponse.json({ error: 'No schedule id' }, { status: 400 });

  // Fetch the schedule
  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !schedule) {
    console.error('Schedule not found:', { id, error });
    return NextResponse.json({ error: 'Schedule not found', details: error }, { status: 404 });
  }
  console.log('Fetched schedule:', schedule);

  // Fetch class for max_capacity
  const { data: classData } = await supabase
    .from('classes')
    .select('id, max_capacity')
    .eq('id', schedule.class_id)
    .single();
  console.log('Fetched class:', classData);

  // Prepare course generation
  const coursesToInsert = [];
  const repetitionType = schedule.repetition_type || 'once';
  const maxParticipants = classData?.max_capacity || 10;

  if (repetitionType === 'once') {
    // One-time event
    if (!schedule.schedule_date) {
      console.error('No schedule_date for one-time event:', schedule);
      return NextResponse.json({ error: 'No schedule_date for one-time event' }, { status: 400 });
    }
    coursesToInsert.push({
      schedule_id: schedule.id,
      class_id: schedule.class_id,
      trainer_id: schedule.trainer_id,
      course_date: schedule.schedule_date.split('T')[0],
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      max_participants: maxParticipants,
      is_active: true,
      status: 'scheduled',
    });
    console.log('Generated one-time course:', coursesToInsert[0]);
  } else {
    // Recurring event
    const startDate = schedule.start_date ? schedule.start_date.split('T')[0] : undefined;
    const endDate = schedule.end_date ? schedule.end_date.split('T')[0] : undefined;
    if (!startDate || !endDate) {
      console.error('Missing start_date or end_date for recurring event:', schedule);
      return NextResponse.json({ error: 'Missing start_date or end_date for recurring event' }, { status: 400 });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (
        (repetitionType === 'weekly' && d.getDay() === schedule.day_of_week) ||
        (repetitionType === 'daily')
      ) {
        const courseObj = {
          schedule_id: schedule.id,
          class_id: schedule.class_id,
          trainer_id: schedule.trainer_id,
          course_date: d.toISOString().split('T')[0],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          max_participants: maxParticipants,
          is_active: true,
          status: 'scheduled',
        };
        coursesToInsert.push(courseObj);
        generatedDates.push(courseObj.course_date);
      }
    }
    console.log('Generated recurring course dates:', generatedDates);
  }

  console.log('Final coursesToInsert:', coursesToInsert);

  if (coursesToInsert.length === 0) {
    console.error('No courses to insert for schedule:', schedule);
    return NextResponse.json({ error: 'No courses to insert' }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from('courses')
    .insert(coursesToInsert);
  if (insertError) {
    console.error('Failed to insert courses:', insertError);
    return NextResponse.json({ error: 'Failed to insert courses', details: insertError }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: coursesToInsert.length });
} 