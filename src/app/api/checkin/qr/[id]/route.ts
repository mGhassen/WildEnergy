import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Get the session token from Authorization header (primary) or cookies (fallback)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;

  console.log('Check-in QR API - Auth header:', authHeader ? 'present' : 'missing');
  console.log('Check-in QR API - Token:', token ? 'present' : 'missing');

  if (!token) {
    console.log('Check-in QR API - No token found');
    return NextResponse.json({ success: false, message: 'Unauthorized - No token provided' }, { status: 401 });
  }

  // 2. Validate the token and get the user using the server client
  console.log('Check-in QR API - Validating token...');
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);

  if (error) {
    console.log('Check-in QR API - Token validation error:', error);
  }

  if (error || !user) {
    console.log('Check-in QR API - Invalid token or no user');
    return NextResponse.json({ success: false, message: 'Unauthorized - Invalid token' }, { status: 401 });
  }

  console.log('Check-in QR API - Token validated, user ID:', user.id);

  // 3. Check if the user is an admin
  console.log('Check-in QR API - Checking admin status for user:', user.id);
  const { data: profile, error: profileError } = await supabaseServer
    .from('users')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError) {
    console.log('Check-in QR API - Profile error:', profileError);
  }

  if (!profile) {
    console.log('Check-in QR API - No profile found for user:', user.id);
    return NextResponse.json({ success: false, message: 'Forbidden - User profile not found' }, { status: 403 });
  }

  if (!profile.is_admin) {
    console.log('Check-in QR API - User is not admin:', user.id);
    return NextResponse.json({ success: false, message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  console.log('Check-in QR API - Admin access confirmed for user:', user.id);

  try {
    const { id: qrCode } = await params;
    console.log('Check-in QR API - Looking for QR code:', qrCode);

    // Find the registration by QR code
    console.log('Check-in QR API - Querying class_registrations table...');
    const { data: registration, error: regError } = await supabaseServer
      .from('class_registrations')
      .select(`
        id,
        status,
        registration_date,
        user_id,
        course_id,
        qr_code,
        users (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        courses (
          id,
          course_date,
          start_time,
          end_time,
          class_id,
          trainer_id
        )
      `)
      .eq('qr_code', qrCode)
      .single();

    if (regError) {
      console.log('Check-in QR API - Registration query error:', regError);
    }

    if (!registration) {
      console.log('Check-in QR API - No registration found for QR code:', qrCode);
      
      // Let's also check what QR codes exist in the database
      const { data: allQrCodes, error: qrError } = await supabaseServer
        .from('class_registrations')
        .select('qr_code, id, user_id')
        .not('qr_code', 'is', null);
      
      if (qrError) {
        console.log('Check-in QR API - Error fetching all QR codes:', qrError);
      } else {
        console.log('Check-in QR API - Available QR codes in database:', allQrCodes?.map(r => ({ qr_code: r.qr_code, id: r.id, user_id: r.user_id })));
      }
      
      return NextResponse.json(
        { success: false, message: 'QR code not found or invalid' },
        { status: 404 }
      );
    }

    console.log('Check-in QR API - Registration found:', registration.id);

    // Get class information
    const { data: classInfo } = await supabaseServer
      .from('classes')
      .select('id, name')
      .eq('id', registration.courses.class_id)
      .single();

    // Get trainer information
    const { data: trainerInfo } = await supabaseServer
      .from('trainers')
      .select(`
        id,
        users (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', registration.courses.trainer_id)
      .single();

    // Get registered and checked-in counts for this course
    const { data: courseRegistrations } = await supabaseServer
      .from('class_registrations')
      .select('id, user_id')
      .eq('course_id', registration.course_id);

    const registeredCount = courseRegistrations?.length || 0;

    // Get check-ins for this course
    const { data: courseCheckins } = await supabaseServer
      .from('checkins')
      .select('registration_id')
      .in('registration_id', courseRegistrations?.map(r => r.id) || []);

    const checkedInCount = courseCheckins?.length || 0;

    // Check if this member is already checked in
    const { data: existingCheckin } = await supabaseServer
      .from('checkins')
      .select('id')
      .eq('registration_id', registration.id)
      .single();

    const alreadyCheckedIn = !!existingCheckin;

    // Get all registered members for this course
    const { data: registeredMembers } = await supabaseServer
      .from('class_registrations')
      .select(`
        users (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('course_id', registration.course_id);

    // Get all checked-in members for this course
    const { data: attendantMembers } = await supabaseServer
      .from('checkins')
      .select(`
        class_registrations!inner (
          users (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('class_registrations.course_id', registration.course_id);

    const checkinInfo = {
      member: registration.users,
      course: {
        ...registration.courses,
        class: classInfo,
        trainer: trainerInfo
      },
      registration: {
        id: registration.id,
        status: registration.status,
        registeredAt: registration.registration_date
      },
      registeredCount,
      checkedInCount,
      alreadyCheckedIn,
      registeredMembers: registeredMembers?.map(r => r.users) || [],
      attendantMembers: attendantMembers?.map(c => c.class_registrations.users) || []
    };

    return NextResponse.json({
      success: true,
      data: checkinInfo
    });

  } catch (error) {
    console.error('QR check-in info error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 