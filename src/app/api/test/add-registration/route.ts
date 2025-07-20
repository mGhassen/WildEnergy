import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First, let's check what users and courses exist
    const { data: users } = await supabaseServer()
      .from('users')
      .select('id, first_name, last_name, email')
      .limit(5);

    const { data: courses } = await supabaseServer()
      .from('courses')
      .select('id, course_date, start_time, end_time, class_id')
      .limit(5);

    console.log('Available users:', users);
    console.log('Available courses:', courses);

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No users found in database' 
      }, { status: 400 });
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No courses found in database' 
      }, { status: 400 });
    }

    // Use the first user and first course
    const testUser = users[0];
    const testCourse = courses[0];
    const testQrCode = 'REG_1752354439009_gbcgwqsfa';

    // Check if this QR code already exists
    const { data: existingReg } = await supabaseServer()
      .from('class_registrations')
      .select('id, qr_code')
      .eq('qr_code', testQrCode)
      .single();

    if (existingReg) {
      return NextResponse.json({
        success: true,
        message: 'QR code already exists',
        registration: existingReg
      });
    }

    // Create the test registration
    const { data: registration, error: regError } = await supabaseServer()
      .from('class_registrations')
      .insert({
        user_id: testUser.id,
        course_id: testCourse.id,
        qr_code: testQrCode,
        status: 'registered',
        registration_date: new Date().toISOString()
      })
      .select('*')
      .single();

    if (regError) {
      console.error('Registration creation error:', regError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create registration',
        error: regError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test registration created successfully',
      registration: {
        id: registration.id,
        qr_code: registration.qr_code,
        user_id: registration.user_id,
        course_id: registration.course_id,
        status: registration.status
      },
      user: testUser,
      course: testCourse
    });

  } catch (error) {
    console.error('Test registration error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create test registration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 