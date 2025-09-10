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
    
    // Fetch schedules with all related data - including category and group details
    const { data: schedules, error } = await supabaseServer()
      .from('schedules')
      .select(`
        *,
        classes (
          id, name, max_capacity, duration, category_id,
          category:categories (
            id,
            name,
            color,
            group:groups (
              id,
              name,
              color
            )
          )
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Schedules API error:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules', details: error.message }, { status: 500 });
    }
    
    // Debug: Log schedule information
    console.log('Total schedules found:', schedules?.length || 0);
    if (schedules && schedules.length > 0) {
      console.log('First schedule classes data:', schedules[0].classes);
      console.log('First schedule category data:', schedules[0].classes?.category);
    } else {
      console.log('No schedules found in database');
    }
    
    // Get trainer user details separately using trainer_id
    const trainerIds = schedules
      ?.filter(schedule => schedule.trainer_id)
      .map(schedule => schedule.trainer_id) || [];
    
    let trainerUsers: Record<string, any> = {};
    if (trainerIds.length > 0) {
      const { data: users } = await supabaseServer()
        .from('user_profiles')
        .select('trainer_id, first_name, last_name, email, phone, specialization, experience_years, bio, certification, hourly_rate, trainer_status')
        .in('trainer_id', trainerIds);
      
      if (users) {
        trainerUsers = users.reduce((acc: Record<string, any>, user: any) => {
          acc[user.trainer_id] = user;
          return acc;
        }, {});
      }
    }
    
    // Transform the data to flatten the nested structure
    const transformedSchedules = schedules?.map(schedule => ({
      ...schedule,
      class: schedule.classes ? {
        id: schedule.classes.id,
        name: schedule.classes.name,
        max_capacity: schedule.classes.max_capacity,
        duration: schedule.classes.duration,
        category_id: schedule.classes.category_id,
        category: schedule.classes.category
      } : null,
      trainer: trainerUsers[schedule.trainer_id] ? {
        id: trainerUsers[schedule.trainer_id].trainer_id,
        firstName: trainerUsers[schedule.trainer_id].first_name || "",
        lastName: trainerUsers[schedule.trainer_id].last_name || "",
        email: trainerUsers[schedule.trainer_id].email || "",
        phone: trainerUsers[schedule.trainer_id].phone || "",
        specialization: trainerUsers[schedule.trainer_id].specialization,
        experience_years: trainerUsers[schedule.trainer_id].experience_years,
        bio: trainerUsers[schedule.trainer_id].bio,
        certification: trainerUsers[schedule.trainer_id].certification,
        hourly_rate: trainerUsers[schedule.trainer_id].hourly_rate,
        status: trainerUsers[schedule.trainer_id].trainer_status,
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
    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const scheduleData = await req.json();
    console.log('Received schedule data:', scheduleData);
    
    const { data: schedule, error } = await supabaseServer()
      .from('schedules')
      .insert(scheduleData)
      .select('*')
      .single();
    if (error) {
      console.error('Schedule creation error:', error);
      return NextResponse.json({ error: 'Failed to create schedule', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Schedule creation exception:', error);
    return NextResponse.json({ error: 'Failed to create schedule', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
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