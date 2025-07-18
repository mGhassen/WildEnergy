import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/users\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  // Allow user to fetch their own info, or admin to fetch any
  if (user.id !== id) {
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const { data: userData, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(userData);
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
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
  const updates = await request.json();
  const { data: updatedUser, error } = await supabaseServer
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error || !updatedUser) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
  return NextResponse.json(updatedUser);
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
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
  // Delete from users table
  const { error: dbError } = await supabaseServer
    .from('users')
    .delete()
    .eq('id', id);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
  // Delete from Supabase Auth
  const { error: authError2 } = await supabaseServer.auth.admin.deleteUser(id);
  if (authError2) {
    return NextResponse.json({ error: authError2.message }, { status: 500 });
  }
  return NextResponse.json({ message: `User ${id} deleted` });
} 