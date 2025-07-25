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
    // Fetch all classes
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
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
    const { name, description, categoryId, duration, maxCapacity, equipment, isActive, difficulty } = await req.json();
    if (!name || !categoryId || !duration || !maxCapacity) {
      return NextResponse.json({ error: 'Missing required class fields' }, { status: 400 });
    }
    const classData = {
      name: name.trim(),
      description: description ? String(description).trim() : undefined,
      category_id: Number(categoryId),
      difficulty: difficulty || 'beginner',
      duration_minutes: Number(duration),
      max_capacity: Number(maxCapacity),
      equipment: equipment || null,
      is_active: isActive !== undefined ? Boolean(isActive) : true,
    };
    const { data: newClass, error } = await supabase
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