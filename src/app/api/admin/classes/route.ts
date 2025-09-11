import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch all classes with category and group information through many-to-many relationship
    const { data: classes, error } = await supabaseServer()
      .from('classes')
      .select(`
        *,
        category:categories (
          id,
          name,
          color,
          category_groups(
            group:groups(
              id,
              name,
              color
            )
          )
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }
    return NextResponse.json(classes);
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
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { name, description, category_id, duration, max_capacity, equipment, is_active, difficulty } = await req.json();
    if (!name || !duration || !max_capacity) {
      return NextResponse.json({ error: 'Missing required class fields' }, { status: 400 });
    }
    const classData = {
      name: name.trim(),
      description: description ? String(description).trim() : undefined,
      category_id: category_id ? Number(category_id) : null,
      difficulty: difficulty || 'beginner',
      duration: Number(duration),
      max_capacity: Number(max_capacity),
      equipment: equipment || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    };
    const { data: newClass, error } = await supabaseServer()
      .from('classes')
      .insert(classData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create class', details: error.message }, { status: 500 });
    }
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
} 