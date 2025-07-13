import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    const updates = await req.json();
    // Remove className/class_name if present
    delete updates.className;
    delete updates.class_name;
    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
    return NextResponse.json(updatedClass);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
} 