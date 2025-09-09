import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  const parts = pathname.split('/');
  const idIndex = parts.findIndex(part => part === 'users') + 1;
  return idIndex < parts.length ? parts[idIndex] : null;
}

export async function GET(request: NextRequest) {
  const accountId = extractIdFromUrl(request);
  if (!accountId) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  // Allow user to fetch their own info, or admin to fetch any
  if (user.id !== accountId) {
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', user.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const { data: userProfile, error: profileError } = await supabaseServer()
    .from('user_profiles')
    .select('*')
    .eq('account_id', accountId)
    .single();
  if (profileError || !userProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(userProfile);
}

export async function PUT(request: NextRequest) {
  const accountId = extractIdFromUrl(request);
  if (!accountId) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
  const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !adminUser) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', adminUser.email)
    .single();
  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const updateData = await request.json();
  updateData.accountId = accountId; // Ensure accountId is set
  
  // Use the same logic as the main PUT route
  const { profileData, accountData, memberData, trainerData } = updateData;
    
  // Update account if account data is provided
  if (accountData) {
    const accountUpdates: Record<string, unknown> = {};
    if (accountData.email !== undefined) accountUpdates.email = accountData.email;
    if (accountData.status !== undefined) accountUpdates.status = accountData.status;
    if (accountData.isAdmin !== undefined) accountUpdates.is_admin = accountData.isAdmin;
    
    if (Object.keys(accountUpdates).length > 0) {
      const { error: accountError } = await supabaseServer()
        .from('accounts')
        .update(accountUpdates)
        .eq('id', accountId);
      
      if (accountError) {
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
      }
    }
  }
  
  // Update profile if profile data is provided
  if (profileData) {
    const profileUpdates: Record<string, unknown> = {};
    if (profileData.firstName !== undefined) profileUpdates.first_name = profileData.firstName;
    if (profileData.lastName !== undefined) profileUpdates.last_name = profileData.lastName;
    if (profileData.phone !== undefined) profileUpdates.phone = profileData.phone;
    if (profileData.dateOfBirth !== undefined) profileUpdates.date_of_birth = profileData.dateOfBirth;
    if (profileData.address !== undefined) profileUpdates.address = profileData.address;
    if (profileData.profession !== undefined) profileUpdates.profession = profileData.profession;
    if (profileData.emergencyContactName !== undefined) profileUpdates.emergency_contact_name = profileData.emergencyContactName;
    if (profileData.emergencyContactPhone !== undefined) profileUpdates.emergency_contact_phone = profileData.emergencyContactPhone;
    
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseServer()
        .from('profiles')
        .update(profileUpdates)
        .eq('id', accountId);
      
      if (profileError) {
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    }
  }
  
  // Return the updated user profile
  const { data: userProfile, error: userProfileError } = await supabaseServer()
    .from('user_profiles')
    .select('*')
    .eq('account_id', accountId)
    .single();
  
  if (userProfileError) {
    return NextResponse.json({ error: 'Failed to fetch updated user profile' }, { status: 500 });
  }
  
  return NextResponse.json(userProfile);
}

export async function DELETE(request: NextRequest) {
  console.log('DELETE /api/admin/users/[id] called');
  const accountId = extractIdFromUrl(request);
  console.log('Extracted account ID:', accountId);
  if (!accountId) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }
  const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !adminUser) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', adminUser.email)
    .single();
  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  // Delete from Supabase Auth (this will cascade to account, which will cascade to other tables)
  console.log('Deleting user from Supabase Auth with account ID:', accountId);
  const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(accountId);
  if (deleteAuthError) {
    console.error('Failed to delete from Supabase Auth:', deleteAuthError);
    return NextResponse.json({ 
      error: `Failed to delete user from authentication: ${deleteAuthError.message}` 
    }, { status: 500 });
  }
  
  console.log('Successfully deleted user from Supabase Auth and cascaded to database');
  return NextResponse.json({ message: `User ${accountId} deleted` });
} 