import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
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
    if (userProfile.is_admin) {
      // Admin: return all registrations
      const { data: registrations, error } = await supabase
        .from('class_registrations')
        .select('*');
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      return NextResponse.json(registrations);
    } else {
      // User: return own registrations
      const { data: registrations, error } = await supabase
        .from('class_registrations')
        .select('*')
        .eq('user_id', userProfile.id);
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
      }
      return NextResponse.json(registrations);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    // Check if already registered
    const { data: existing } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('course_id', courseId)
      .single();
    if (existing) {
      return NextResponse.json({ error: 'Already registered for this course' }, { status: 400 });
    }
    // Create registration
    const { data: registration, error } = await supabase
      .from('class_registrations')
      .insert({ user_id: userProfile.id, course_id: courseId })
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
    }
    return NextResponse.json({ success: true, registration });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
} 