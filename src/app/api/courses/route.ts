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
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    // Fetch all courses with related class and trainer data
    const { data: courses, error } = await supabaseServer
      .from('courses')
      .select(`
        *,
        class:classes(id, name, description, category_id, duration, max_capacity),
        trainer:trainers(
          id,
          user_id,
          specialization,
          experience_years,
          bio,
          certification,
          status,
          user:users(id, first_name, last_name, email)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
    // Return empty array if no courses found, instead of undefined
    return NextResponse.json(courses || []);
  } catch (error) {
    console.error('API error:', error);
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
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const courseData = await req.json();
    const { data: course, error } = await supabaseServer
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