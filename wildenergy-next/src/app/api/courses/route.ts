import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch all courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
    return NextResponse.json(courses);
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
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const courseData = await req.json();
    const { data: course, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
    }
    return NextResponse.json({ success: true, course });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
} 