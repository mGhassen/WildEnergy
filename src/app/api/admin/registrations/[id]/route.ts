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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrationId = parseInt(id);

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
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: registration, error } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(name, description, category:categories(name))
        )
      `)
      .eq('id', registrationId)
      .single();

    if (error || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    let member = null;
    if (registration.member_id) {
      const { data: profile } = await supabaseServer()
        .from('user_profiles')
        .select('member_id, first_name, last_name, email')
        .eq('member_id', registration.member_id)
        .maybeSingle();
      member = profile;
    }

    return NextResponse.json({ ...registration, member });
  } catch (error) {
    console.error('GET registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    const { data: registration, error: fetchError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        member_id,
        subscription_id,
        status,
        course_id,
        session_source,
        group_id,
        pool_id,
        course:courses(
          id,
          current_participants,
          max_participants
        )
      `)
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('Delete registration fetch:', fetchError);
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    let refundSession = registration.status !== 'cancelled';
    let refundSubscriptionId: number | undefined = undefined;
    try {
      const body = await req.json();
      if (typeof body.refundSession === 'boolean') {
        refundSession = body.refundSession;
      }
      if (typeof body.refundSubscriptionId === 'number' && Number.isFinite(body.refundSubscriptionId)) {
        refundSubscriptionId = body.refundSubscriptionId;
      }
    } catch {}

    if (refundSession) {
      const targetSubscriptionId =
        refundSubscriptionId ?? registration.subscription_id ?? null;
      if (!targetSubscriptionId || !registration.member_id || !registration.course_id) {
        return NextResponse.json(
          { error: 'Select a subscription to refund the session' },
          { status: 400 }
        );
      }

      const { data: refundResult, error: refundError } = await supabaseServer().rpc(
        'refund_group_session',
        {
          p_user_id: registration.member_id,
          p_course_id: registration.course_id,
          p_subscription_id: targetSubscriptionId,
          p_session_source: registration.session_source ?? null,
          p_group_id: registration.group_id ?? null,
          p_pool_id: registration.pool_id ?? null,
        }
      );

      let refundJson: any = refundResult;
      if (typeof refundResult === 'string') {
        try {
          refundJson = JSON.parse(refundResult);
        } catch {
          refundJson = null;
        }
      }
      if (refundError || refundJson?.success !== true) {
        return NextResponse.json(
          {
            error:
              refundJson?.error ||
              refundError?.message ||
              'Failed to refund session',
          },
          { status: 400 }
        );
      }
    }

    const { error: checkinsDeleteError } = await supabaseServer()
      .from('checkins')
      .delete()
      .eq('registration_id', registrationId);

    if (checkinsDeleteError) {
      console.error('Error deleting check-ins for registration:', checkinsDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete related check-ins', details: checkinsDeleteError },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabaseServer()
      .from('class_registrations')
      .delete()
      .eq('id', registrationId);

    if (deleteError) {
      console.error('Error deleting registration:', deleteError);
      return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
    }

    // Cancel already decremented participants — don't do it again.
    if (registration.status !== 'cancelled') {
      const courseRaw = registration.course as
        | { id: number; current_participants: number; max_participants: number }
        | { id: number; current_participants: number; max_participants: number }[]
        | null;
      const course = Array.isArray(courseRaw) ? courseRaw[0] : courseRaw;
      if (course?.id != null) {
        const newParticipantCount = Math.max(0, (course.current_participants ?? 0) - 1);

        const { error: updateError } = await supabaseServer()
          .from('courses')
          .update({ current_participants: newParticipantCount })
          .eq('id', course.id);

        if (updateError) {
          console.error('Error updating course participant count:', updateError);
        }
      }
    }

    let member: { first_name?: string; last_name?: string; email?: string } | null = null;
    if (registration.member_id) {
      const { data: profile } = await supabaseServer()
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('member_id', registration.member_id)
        .maybeSingle();
      member = profile;
    }

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully',
      registration: {
        id: registration.id,
        member,
        course: registration.course,
      },
    });

  } catch (error) {
    console.error('Delete registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
