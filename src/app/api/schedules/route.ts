import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify user (member or admin)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Fixed query: trainers table has user_id that references users table
    const { data: schedules, error } = await supabaseServer()
      .from('schedules')
      .select(`
        *,
        classes (
          id, name, max_capacity, duration, category_id
        ),
        trainers!trainer_id (
          id, user_id, specialization, experience_years, bio, certification
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Schedules API error:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules', details: error }, { status: 500 });
    }
    
    // Get trainer user details separately
    const trainerUserIds = schedules
      ?.filter(schedule => schedule.trainers?.user_id)
      .map(schedule => schedule.trainers.user_id) || [];
    
    let trainerUsers: Record<string, any> = {};
    if (trainerUserIds.length > 0) {
      const { data: users } = await supabaseServer()
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', trainerUserIds);
      
      if (users) {
        trainerUsers = users.reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }
    
    // Transform the data to flatten the nested structure
    const transformedSchedules = schedules?.map(schedule => ({
      ...schedule,
      trainer: schedule.trainers ? {
        id: schedule.trainers.id,
        specialization: schedule.trainers.specialization,
        experience_years: schedule.trainers.experience_years,
        bio: schedule.trainers.bio,
        certification: schedule.trainers.certification,
        ...trainerUsers[schedule.trainers.user_id]
      } : null
    })) || [];
    
    return NextResponse.json(transformedSchedules);
  } catch (e) {
    console.error('Schedules API exception:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const scheduleData = await req.json();
    
    // Generate a unique code for the schedule
    const { data: lastSchedule } = await supabaseServer()
      .from('schedules')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    const nextId = (lastSchedule?.id || 0) + 1;
    const code = `SCH-${nextId.toString().padStart(4, '0')}`;
    
    const { data: schedule, error } = await supabaseServer()
      .from('schedules')
      .insert({ ...scheduleData, code })
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }
    return NextResponse.json({ success: true, schedule });
  } catch {
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
    const { error } = await supabaseServer()
      .from('schedules')
      .delete()
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
} 