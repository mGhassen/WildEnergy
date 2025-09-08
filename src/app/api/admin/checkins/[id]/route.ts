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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const { id } = await context.params;
    const checkinId = parseInt(id);
    if (!checkinId || isNaN(checkinId)) {
      return NextResponse.json({ error: 'Invalid checkin ID' }, { status: 400 });
    }

    const { data: checkin, error } = await supabaseServer()
      .from('checkins')
      .select(`
        *,
        registration:registration_id (
          id,
          user_id,
          course_id,
          status,
          qr_code,
          registration_date,
          course:course_id (
            id,
            course_date,
            start_time,
            end_time,
            schedule_id,
            class_id,
            trainer_id,
            schedule:schedule_id (
              id,
              day_of_week,
              start_time,
              end_time
            ),
            class:class_id (id, name, category_id, category:category_id (id, name)),
            trainer:trainer_id (id, user:user_id (first_name, last_name))
          )
        ),
        member:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', checkinId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch checkin' }, { status: 500 });
    }

    if (!checkin) {
      return NextResponse.json({ error: 'Checkin not found' }, { status: 404 });
    }

    return NextResponse.json(checkin);
  } catch (error) {
    console.error('Get checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const { id } = await context.params;
    const checkinId = parseInt(id);
    if (!checkinId || isNaN(checkinId)) {
      return NextResponse.json({ error: 'Invalid checkin ID' }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('checkins')
      .delete()
      .eq('id', checkinId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete checkin' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Checkin deleted successfully' });
  } catch (error) {
    console.error('Delete checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
