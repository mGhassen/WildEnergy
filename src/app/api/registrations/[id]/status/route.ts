import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const registrationId = parseInt(resolvedParams.id);
    
    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    const { data: registration, error } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        status,
        user_id,
        course_id,
        registration_date,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(name)
        )
      `)
      .eq('id', registrationId)
      .single();

    if (error) {
      console.error('Error fetching registration:', error);
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        status: registration.status,
        userId: registration.user_id,
        courseId: registration.course_id,
        registrationDate: registration.registration_date,
        course: registration.course
      }
    });

  } catch (error) {
    console.error('Get registration status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 