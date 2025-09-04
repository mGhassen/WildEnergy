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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const registrationId = parseInt(resolvedParams.id);
    
    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get registration details before deletion
    const { data: registration, error: fetchError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          current_participants,
          max_participants,
          class:classes(name),
          trainer:trainers(user:users(first_name, last_name))
        ),
        member:users(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Delete the registration
    const { error: deleteError } = await supabaseServer()
      .from('class_registrations')
      .delete()
      .eq('id', registrationId);

    if (deleteError) {
      console.error('Error deleting registration:', deleteError);
      return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
    }

    // Update course participant count
    const course = registration.course as any;
    if (course) {
      const newParticipantCount = Math.max(0, course.current_participants - 1);
      
      const { error: updateError } = await supabaseServer()
        .from('courses')
        .update({ current_participants: newParticipantCount })
        .eq('id', course.id);

      if (updateError) {
        console.error('Error updating course participant count:', updateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Registration deleted successfully',
      registration: {
        id: registration.id,
        member: registration.member,
        course: registration.course
      }
    });

  } catch (error) {
    console.error('Delete registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
