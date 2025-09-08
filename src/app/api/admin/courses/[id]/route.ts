import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // Fetch course with comprehensive related data
    const { data: course, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(
          id, 
          name, 
          description, 
          duration, 
          max_capacity, 
          equipment,
          difficulty,
          is_active,
          category:categories(
            id,
            name,
            color,
            group:groups(
              id,
              name,
              color
            )
          )
        ),
        trainer:trainers(
          id,
          user_id,
          specialization,
          experience_years,
          bio,
          certification,
          status,
          user:users(
            id, 
            first_name, 
            last_name, 
            email,
            phone
          )
        ),
        schedule:schedules(
          id,
          day_of_week,
          repetition_type,
          start_date,
          end_date,
          is_active
        )
      `)
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Course fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch registrations for this course
    const { data: registrations, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        registration_date,
        status,
        notes,
        qr_code,
        user:users(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('course_id', course.id);

    if (regError) {
      console.error('Registrations fetch error:', regError);
    }

    // Fetch check-ins for this course (through registrations)
    const { data: checkins, error: checkinError } = await supabaseServer()
      .from('checkins')
      .select(`
        id,
        checkin_time,
        registration_id,
        user:users(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .in('registration_id', registrations?.map(r => r.id) || []);

    if (checkinError) {
      console.error('Check-ins fetch error:', checkinError);
    }

    // Calculate attendance statistics
    const totalRegistrations = registrations?.length || 0;
    const totalCheckins = checkins?.length || 0;
    const attendanceRate = totalRegistrations > 0 ? Math.round((totalCheckins / totalRegistrations) * 100) : 0;

    // Return comprehensive course data
    return NextResponse.json({
      ...course,
      registrations: registrations || [],
      checkins: checkins || [],
      statistics: {
        totalRegistrations,
        totalCheckins,
        attendanceRate,
        availableSpots: course.max_participants - totalRegistrations
      }
    });

  } catch (error) {
    console.error('Course API exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const { memberIds } = await req.json();
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'Member IDs are required' }, { status: 400 });
    }

    // Check if course exists and get capacity info
    const { data: course, error: courseError } = await supabaseServer()
      .from('courses')
      .select('id, max_participants, current_participants')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if there's enough capacity
    const availableSpots = course.max_participants - course.current_participants;
    if (memberIds.length > availableSpots) {
      return NextResponse.json({ 
        error: `Not enough capacity. Available spots: ${availableSpots}, trying to add: ${memberIds.length}` 
      }, { status: 400 });
    }

    // Check which members are already registered
    const { data: existingRegistrations } = await supabaseServer()
      .from('class_registrations')
      .select('user_id')
      .eq('course_id', courseId)
      .in('user_id', memberIds)
      .eq('status', 'registered');

    const alreadyRegistered = existingRegistrations?.map(r => r.user_id) || [];
    const newMemberIds = memberIds.filter(id => !alreadyRegistered.includes(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json({ 
        error: 'All selected members are already registered for this course' 
      }, { status: 400 });
    }

    // Create registrations for new members
    const registrations = newMemberIds.map(userId => ({
      user_id: userId,
      course_id: courseId,
      qr_code: `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      registration_date: new Date().toISOString(),
      status: 'registered',
      notes: 'Added by admin'
    }));

    const { data: newRegistrations, error: registrationError } = await supabaseServer()
      .from('class_registrations')
      .insert(registrations)
      .select('id, user_id');

    if (registrationError) {
      console.error('Registration creation error:', registrationError);
      return NextResponse.json({ error: 'Failed to register members' }, { status: 500 });
    }

    // Update course current_participants count
    const { error: updateError } = await supabaseServer()
      .from('courses')
      .update({ 
        current_participants: course.current_participants + newRegistrations.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Course update error:', updateError);
      return NextResponse.json({ error: 'Failed to update course capacity' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      registered: newRegistrations.length,
      alreadyRegistered: alreadyRegistered.length,
      message: `Successfully registered ${newRegistrations.length} members${alreadyRegistered.length > 0 ? ` (${alreadyRegistered.length} were already registered)` : ''}`
    });

  } catch (error) {
    console.error('Course member addition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const updateData = await req.json();
    
    // Remove fields that shouldn't be updated directly
    const { id: updateId, created_at, updated_at, ...allowedUpdates } = updateData;

    const { data: course, error } = await supabaseServer()
      .from('courses')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) {
      console.error('Course update error:', error);
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json({ success: true, course });

  } catch (error) {
    console.error('Course update exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // Check if course has registrations or check-ins
    const { data: registrations } = await supabaseServer()
      .from('class_registrations')
      .select('id')
      .eq('course_id', courseId);

    const { data: checkins } = await supabaseServer()
      .from('checkins')
      .select(`
        id,
        registration_id,
        class_registrations!inner(course_id)
      `)
      .eq('class_registrations.course_id', courseId);

    if ((registrations?.length || 0) > 0 || (checkins?.length || 0) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete course with existing registrations or check-ins' 
      }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Course deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Course deletion exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}