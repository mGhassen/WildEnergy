import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) return null;
  
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, is_admin, accessible_portals')
    .eq('account_id', user.id)
    .single();

  return userProfile;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is a member
    if (!userProfile.member_id) {
      return NextResponse.json({ error: 'Member access required' }, { status: 403 });
    }

    // Fetch registrations for the member
    const { data: registrations, error } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(
            id,
            name,
            description,
            category:categories(id, name)
          ),
          trainer:trainers(
            id,
            account_id,
            specialization,
            experience_years
          )
        )
      `)
      .eq('member_id', userProfile.member_id)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    // Fetch trainer details separately
    const trainerAccountIds = registrations?.map(r => r.course?.trainer?.account_id).filter(Boolean) || [];
    let trainerDetails: Record<string, any> = {};
    
    if (trainerAccountIds.length > 0) {
      const { data: trainers } = await supabaseServer()
        .from('user_profiles')
        .select('account_id, first_name, last_name')
        .in('account_id', trainerAccountIds);
      
      if (trainers) {
        trainers.forEach(trainer => {
          trainerDetails[trainer.account_id] = trainer;
        });
      }
    }

    // Transform the data to match the expected interface
    const transformedRegistrations = registrations?.map(reg => ({
      id: reg.id,
      course_id: reg.course_id,
      user_id: reg.member_id,
      status: reg.status,
      registration_date: reg.registration_date,
      qr_code: reg.qr_code,
      notes: reg.notes,
      course: reg.course ? {
        ...reg.course,
        trainer: reg.course.trainer ? {
          id: reg.course.trainer.id,
          user: trainerDetails[reg.course.trainer.account_id] || {
            first_name: 'Unknown',
            last_name: 'Trainer'
          }
        } : null
      } : null
    })) || [];

    return NextResponse.json(transformedRegistrations);
  } catch (error) {
    console.error('GET registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
