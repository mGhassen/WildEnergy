import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    // Verify the token
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if the user is an admin
    const { data: profile } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', user.email)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    // Build the query
    let query = supabaseServer()
      .from('checkins')
      .select(`
        *,
        registration:registration_id (
          id,
          member_id,
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
            trainer:trainer_id (id, account_id, specialization, experience_years)
          )
        ),
        member_id
      `)
      .order('checkin_time', { ascending: false });

    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('checkin_time', startOfDay.toISOString())
        .lte('checkin_time', endOfDay.toISOString());
    }

    const { data: checkins, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch checkins' }, { status: 500 });
    }

    // Fetch member and trainer details separately
    const memberIds = checkins?.map(c => c.member_id).filter(Boolean) || [];
    const trainerAccountIds = checkins?.map(c => c.registration?.course?.trainer?.account_id).filter(Boolean) || [];
    
    let memberDetails: Record<string, any> = {};
    let trainerDetails: Record<string, any> = {};
    
    if (memberIds.length > 0) {
      const { data: members } = await supabaseServer()
        .from('user_profiles')
        .select('member_id, first_name, last_name, email')
        .in('member_id', memberIds);
      
      if (members) {
        members.forEach(member => {
          memberDetails[member.member_id] = member;
        });
      }
    }
    
    if (trainerAccountIds.length > 0) {
      const { data: trainers } = await supabaseServer()
        .from('user_profiles')
        .select('account_id, first_name, last_name, email')
        .in('account_id', trainerAccountIds);
      
      if (trainers) {
        trainers.forEach(trainer => {
          trainerDetails[trainer.account_id] = trainer;
        });
      }
    }

    // Convert snake_case to camelCase and structure the data properly
    const formattedCheckins = (checkins || []).map(checkin => ({
      id: checkin.id,
      memberId: checkin.member_id,
      registrationId: checkin.registration_id,
      checkinTime: checkin.checkin_time,
      sessionConsumed: checkin.session_consumed,
      notes: checkin.notes,
      member: memberDetails[checkin.member_id] ? {
        id: memberDetails[checkin.member_id].member_id,
        firstName: memberDetails[checkin.member_id].first_name,
        lastName: memberDetails[checkin.member_id].last_name,
        email: memberDetails[checkin.member_id].email
      } : undefined,
      registration: checkin.registration ? {
        id: checkin.registration.id,
        qr_code: checkin.registration.qr_code,
        course: checkin.registration.course ? {
          id: checkin.registration.course.id,
          courseDate: checkin.registration.course.course_date,
          startTime: checkin.registration.course.start_time,
          endTime: checkin.registration.course.end_time,
          scheduleId: checkin.registration.course.schedule_id,
          classId: checkin.registration.course.class_id,
          trainerId: checkin.registration.course.trainer_id,
          schedule: checkin.registration.course.schedule ? {
            id: checkin.registration.course.schedule.id,
            dayOfWeek: checkin.registration.course.schedule.day_of_week,
            startTime: checkin.registration.course.schedule.start_time,
            endTime: checkin.registration.course.schedule.end_time
          } : undefined,
          class: checkin.registration.course.class ? {
            id: checkin.registration.course.class.id,
            name: checkin.registration.course.class.name,
            category: checkin.registration.course.class.category?.name || 'Unknown'
          } : undefined,
          trainer: checkin.registration.course.trainer ? {
            id: checkin.registration.course.trainer.id,
            firstName: trainerDetails[checkin.registration.course.trainer.account_id]?.first_name || 'Unknown',
            lastName: trainerDetails[checkin.registration.course.trainer.account_id]?.last_name || '',
            email: trainerDetails[checkin.registration.course.trainer.account_id]?.email || ''
          } : undefined
        } : undefined
      } : undefined
    }));

    return NextResponse.json(formattedCheckins);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token
    const { data: { user: authUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if the user is an admin
    const { data: profile } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', authUser.email)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { qr_code } = body;
    
    if (!qr_code) {
      return NextResponse.json({ 
        success: false, 
        message: 'QR code is required' 
      }, { status: 400 });
    }

    console.log('Processing QR code check-in:', qr_code);

    // Get registration by QR code
    const { data: registration, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select('*')
      .eq('qr_code', qr_code)
      .single();

    if (regError || !registration) {
      return NextResponse.json({ 
        success: false, 
        message: 'Registration not found for this QR code' 
      }, { status: 404 });
    }

    // Check if already checked in
    const { data: existingCheckins } = await supabaseServer()
      .from('checkins')
      .select('*')
      .eq('registration_id', registration.id);

    if (existingCheckins && existingCheckins.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'User already checked in for this class' 
      }, { status: 400 });
    }

    // Get user and course details
    const { data: memberUser } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('id', registration.member_id)
      .single();

    if (!memberUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const { data: course } = await supabaseServer()
      .from('courses')
      .select('*')
      .eq('id', registration.course_id)
      .single();

    if (!course) {
      return NextResponse.json({ 
        success: false, 
        message: 'Course not found' 
      }, { status: 404 });
    }

    // Create check-in
    const checkinData = {
      member_id: registration.member_id,
      registration_id: registration.id,
      session_consumed: true,
      notes: `QR code check-in for course ${registration.course_id}`,
      checkin_time: new Date().toISOString()
    };

    const { data: checkin, error: checkinError } = await supabaseServer()
      .from('checkins')
      .insert(checkinData)
      .select()
      .single();

    if (checkinError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create check-in' 
      }, { status: 500 });
    }

    // Update registration status to attended
    const { error: updateError } = await supabaseServer()
      .from('class_registrations')
      .update({ 
        status: 'attended',
        notes: 'Checked in via QR code'
      })
      .eq('id', registration.id);

    if (updateError) {
      console.error('Error updating registration status:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Check-in created but failed to update registration status' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      data: {
        member_name: `${memberUser.first_name} ${memberUser.last_name}`,
        class_name: course.class_id || 'Class',
        checkin_time: checkin.checkin_time
      }
    });

  } catch {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process check-in'
    }, { status: 500 });
  }
} 