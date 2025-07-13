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
    // Fetch all trainers
    const { data: trainers, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('is_trainer', true)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 });
    }
    return NextResponse.json(trainers);
  } catch {
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
    const { firstName, lastName, email, phone, status } = await req.json();
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    // Create auth user with random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    const { data: authUser, error: userError } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone,
        is_trainer: true,
      },
      email_confirm: true,
    });
    if (userError || !authUser.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create trainer user' }, { status: 400 });
    }
    // Create user record in users table
    const { data: user, error: userCreateError } = await supabaseServer
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        is_member: false,
        is_trainer: true,
        status: status || 'active',
        subscription_status: 'inactive',
      })
      .select('*')
      .single();
    if (userCreateError || !user) {
      await supabaseServer.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      return NextResponse.json({ error: userCreateError?.message || 'Failed to create user record' }, { status: 400 });
    }
    // Create trainer profile (optional, if you have a trainers table)
    // ...
    return NextResponse.json({ success: true, trainer: user });
  } catch {
    return NextResponse.json({ error: 'Failed to create trainer' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const { id, ...updates } = await req.json();
    const { data: trainer, error } = await supabaseServer
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update trainer' }, { status: 500 });
    }
    return NextResponse.json({ success: true, trainer });
  } catch {
    return NextResponse.json({ error: 'Failed to update trainer' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    const { id } = await req.json();
    // Get trainer to delete
    const { data: trainerToDelete, error: trainerError } = await supabaseServer
      .from('users')
      .select('auth_user_id')
      .eq('id', id)
      .single();
    if (trainerError) throw trainerError;
    // Delete from auth
    if (trainerToDelete?.auth_user_id) {
      const { error: deleteAuthError } = await supabaseServer.auth.admin.deleteUser(trainerToDelete.auth_user_id);
      if (deleteAuthError) throw deleteAuthError;
    }
    // Delete from users table
    const { error: deleteError } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete trainer' }, { status: 500 });
  }
} 