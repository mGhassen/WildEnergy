import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/classes\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PATCH(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
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

    const { name, description, category_id, difficulty, duration, max_capacity, equipment, is_active } = await request.json();

    // Validate required fields
    if (!name || !duration || !max_capacity) {
      return NextResponse.json({ error: 'Missing required class fields' }, { status: 400 });
    }

    const updateData = {
      name: name.trim(),
      description: description ? String(description).trim() : null,
      category_id: category_id ? Number(category_id) : null,
      difficulty: difficulty || 'beginner',
      duration: Number(duration),
      max_capacity: Number(max_capacity),
      equipment: equipment || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedClass, error } = await supabaseServer()
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update class', details: error.message }, { status: 500 });
    }

    if (!updatedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
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

    // Check if class exists
    const { data: existingClass, error: fetchError } = await supabaseServer()
      .from('classes')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Delete the class
    const { error: deleteError } = await supabaseServer()
      .from('classes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete class', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 