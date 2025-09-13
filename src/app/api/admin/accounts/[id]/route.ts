import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const pathname = request.nextUrl.pathname;
  const parts = pathname.split('/');
  const idIndex = parts.findIndex(part => part === 'accounts') + 1;
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
    if (profileData.phone !== undefined) {
      profileUpdates.phone = profileData.phone === "" ? null : profileData.phone;
    }
    if (profileData.profileEmail !== undefined) {
      profileUpdates.profile_email = profileData.profileEmail === "" ? null : profileData.profileEmail;
    }
    if (profileData.dateOfBirth !== undefined) {
      profileUpdates.date_of_birth = profileData.dateOfBirth === "" ? null : profileData.dateOfBirth;
    }
    if (profileData.address !== undefined) {
      profileUpdates.address = profileData.address === "" ? null : profileData.address;
    }
    if (profileData.profession !== undefined) {
      profileUpdates.profession = profileData.profession === "" ? null : profileData.profession;
    }
    if (profileData.emergencyContactName !== undefined) {
      profileUpdates.emergency_contact_name = profileData.emergencyContactName === "" ? null : profileData.emergencyContactName;
    }
    if (profileData.emergencyContactPhone !== undefined) {
      profileUpdates.emergency_contact_phone = profileData.emergencyContactPhone === "" ? null : profileData.emergencyContactPhone;
    }
    
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseServer()
        .from('profiles')
        .update(profileUpdates)
        .eq('id', accountId); // In this system, profile.id = account.id
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json({ 
          error: 'Failed to update profile', 
          details: profileError.message 
        }, { status: 500 });
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
  console.log('DELETE /api/admin/accounts/[id] called');
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
  
  // Get the auth_user_id from the accounts table
  const { data: account, error: accountError } = await supabaseServer()
    .from('accounts')
    .select('auth_user_id')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  if (!account.auth_user_id) {
    return NextResponse.json({ error: 'Account has no auth user' }, { status: 400 });
  }

  // Delete from Supabase Auth using the auth_user_id
  console.log('Deleting user from Supabase Auth with auth_user_id:', account.auth_user_id);
  const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(account.auth_user_id);
  if (deleteAuthError) {
    console.error('Failed to delete from Supabase Auth:', deleteAuthError);
    return NextResponse.json({ 
      error: `Failed to delete user from authentication: ${deleteAuthError.message}` 
    }, { status: 500 });
  }
  
  // First, unlink any members from this account (set account_id to NULL)
  console.log('Unlinking members from account');
  const { error: unlinkMembersError } = await supabaseServer()
    .from('members')
    .update({ account_id: null })
    .eq('account_id', accountId);
  
  if (unlinkMembersError) {
    console.error('Failed to unlink members from account:', unlinkMembersError);
    return NextResponse.json({ 
      error: `Failed to unlink members from account: ${unlinkMembersError.message}` 
    }, { status: 500 });
  }
  
  // Check if there are any members still linked to this profile
  console.log('Checking for linked members to profile');
  const { data: linkedMembers, error: checkMembersError } = await supabaseServer()
    .from('members')
    .select('id')
    .eq('profile_id', accountId)
    .limit(1);
  
  if (checkMembersError) {
    console.error('Failed to check linked members:', checkMembersError);
    return NextResponse.json({ 
      error: `Failed to check linked members: ${checkMembersError.message}` 
    }, { status: 500 });
  }
  
  // Only delete the profile if no members are linked to it
  if (!linkedMembers || linkedMembers.length === 0) {
    console.log('No linked members found, deleting profile record');
    const { error: deleteProfileError } = await supabaseServer()
      .from('profiles')
      .delete()
      .eq('id', accountId);
    
    if (deleteProfileError) {
      console.error('Failed to delete profile record:', deleteProfileError);
      return NextResponse.json({ 
        error: `Failed to delete profile record: ${deleteProfileError.message}` 
      }, { status: 500 });
    }
  } else {
    console.log('Linked members found, preserving profile record');
  }
  
  // Manually delete the account record since there's no cascade from auth to accounts
  console.log('Deleting account record from database');
  const { error: deleteAccountError } = await supabaseServer()
    .from('accounts')
    .delete()
    .eq('id', accountId);
  
  if (deleteAccountError) {
    console.error('Failed to delete account record:', deleteAccountError);
    return NextResponse.json({ 
      error: `Failed to delete account record: ${deleteAccountError.message}` 
    }, { status: 500 });
  }
  
  console.log('Successfully deleted user from Supabase Auth, unlinked members, and deleted account from database');
  return NextResponse.json({ message: `User ${accountId} deleted` });
} 