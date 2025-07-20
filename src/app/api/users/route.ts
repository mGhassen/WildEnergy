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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Get all users
    const { data: users, error } = await supabaseServer()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { email, password, firstName, lastName, isAdmin, isMember, isTrainer } = await req.json();
    let authUserId;
    if (!password) {
      // Use Supabase invite flow with correct redirect
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/auth/accept-invitation`;
      const { data: inviteData, error: inviteError } = await supabaseServer().auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
      });
      if (inviteError || !inviteData?.user) {
        return NextResponse.json({ error: inviteError?.message || 'Failed to invite user' }, { status: 400 });
      }
      authUserId = inviteData.user.id;
    } else {
      // Create auth user with password
      const { data: authData, error: signUpError } = await supabaseServer().auth.signUp({ email, password });
      if (signUpError || !authData.user) {
        return NextResponse.json({ error: signUpError?.message || 'Failed to create user' }, { status: 400 });
      }
      authUserId = authData.user.id;
    }
    // Create user profile
    const { data: user, error: userError } = await supabaseServer()
      .from('users')
      .insert([{
        auth_user_id: authUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        is_admin: !!isAdmin,
        is_member: !!isMember,
        is_trainer: !!isTrainer,
        status: 'active',
      }])
      .select()
      .single();
    if (userError) {
      return NextResponse.json({ error: userError.message || 'Failed to create user profile' }, { status: 500 });
    }
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
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
    const { id, firstName, lastName, email, phone, dateOfBirth, memberNotes, isAdmin, isMember, isTrainer, status } = await req.json();
    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
    if (memberNotes !== undefined) updates.member_notes = memberNotes;
    if (isAdmin !== undefined) updates.is_admin = isAdmin;
    if (isMember !== undefined) updates.is_member = isMember;
    if (isTrainer !== undefined) updates.is_trainer = isTrainer;
    if (status !== undefined) updates.status = status;
    const { data: user, error } = await supabaseServer()
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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
    const { id } = await req.json();
    // Get user to delete
    const { data: userToDelete, error: userError } = await supabaseServer()
      .from('users')
      .select('auth_user_id')
      .eq('id', id)
      .single();
    if (userError) throw userError;
    // First delete from auth
    if (userToDelete?.auth_user_id) {
      const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(userToDelete.auth_user_id);
      if (deleteAuthError) throw deleteAuthError;
    }
    // Then delete from users table
    const { error: deleteError } = await supabaseServer()
      .from('users')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 