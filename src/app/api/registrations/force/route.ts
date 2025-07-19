import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return userProfile;
}

export async function POST(req: NextRequest) {
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

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    console.log('Force registration attempt:', { userId: userProfile.id, courseId });

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabaseServer
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('is_active', true)
      .eq('status', 'scheduled')
      .single();

    if (courseError || !course) {
      console.error('Course not found or inactive:', courseError);
      return NextResponse.json({ error: 'Course not found or not available for registration' }, { status: 404 });
    }

    // Check if already registered (but skip overlap check)
    const { data: existing, error: existingError } = await supabaseServer
      .from('class_registrations')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('course_id', courseId)
      .eq('status', 'registered')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing registration:', existingError);
      return NextResponse.json({ error: 'Failed to check registration status' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Already registered for this course' }, { status: 400 });
    }

    // Check if course is full
    if (course.current_participants >= course.max_participants) {
      return NextResponse.json({ error: 'Course is full' }, { status: 400 });
    }

    // Get user's active subscription with sessions remaining
    const { data: activeSubscription, error: subscriptionError } = await supabaseServer
      .from('subscriptions')
      .select('id, sessions_remaining')
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .gt('sessions_remaining', 0)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
    }

    if (!activeSubscription) {
      return NextResponse.json({ error: 'No active subscription with sessions remaining' }, { status: 400 });
    }

    // Use the stored procedure to handle registration with session deduction
    const { data: result, error: procedureError } = await supabaseServer
      .rpc('create_registration_with_updates', {
        p_user_id: userProfile.id,
        p_course_id: courseId,
        p_current_participants: course.current_participants,
        p_subscription_id: activeSubscription.id
      });

    if (procedureError) {
      console.error('Registration procedure error:', procedureError);
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
    }

    console.log('Force registration successful:', result);
    return NextResponse.json({ success: true, registration: result });
  } catch (error) {
    console.error('POST force registration error:', error);
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
} 