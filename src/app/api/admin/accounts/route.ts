import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin using new user system
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
    // Get all users from new user system
    const { data: users, error } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .order('email', { ascending: true });
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
    // Verify admin using new user system
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
    
    const { email, password, firstName, lastName, phone, isAdmin, status, creationMethod, memberData, trainerData } = await req.json();
    let authUserId;
    let accountStatus = status || 'pending'; // Use provided status or default to pending
    
    if (creationMethod === 'invite' || !password) {
      // Use Supabase invite flow with correct redirect
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/auth/accept-invitation`;
      const { data: inviteData, error: inviteError } = await supabaseServer().auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      });
      if (inviteError || !inviteData?.user) {
        return NextResponse.json({ error: inviteError?.message || 'Failed to invite user' }, { status: 400 });
      }
      authUserId = inviteData.user.id;
      accountStatus = 'active'; // Invited users start with 'active' status
    } else {
      // Create auth user with password
      const { data: authData, error: signUpError } = await supabaseServer().auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      if (signUpError || !authData.user) {
        return NextResponse.json({ error: signUpError?.message || 'Failed to create user' }, { status: 400 });
      }
      authUserId = authData.user.id;
      accountStatus = status || 'active'; // Use provided status or default to active for password users
    }
    
    // Create account record
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .insert([{
        auth_user_id: authUserId, // Link to auth user
        email,
        status: accountStatus,
        is_admin: !!isAdmin,
      }])
      .select()
      .single();
    
    if (accountError) {
      return NextResponse.json({ error: accountError.message || 'Failed to create account' }, { status: 500 });
    }
    
    // Create profile record
    const { data: profile, error: profileError } = await supabaseServer()
      .from('profiles')
      .insert([{
        id: account.id, // Profile ID matches account ID
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      }])
      .select()
      .single();
    
    if (profileError) {
      return NextResponse.json({ error: profileError.message || 'Failed to create profile' }, { status: 500 });
    }
    
    // Create member record if member data is provided
    if (memberData) {
      const { data: member, error: memberError } = await supabaseServer()
        .from('members')
        .insert([{
          account_id: account.id,
          profile_id: account.id,
          member_notes: memberData.memberNotes || '',
          credit: memberData.credit || 0,
          status: 'active',
        }])
        .select()
        .single();
      
      if (memberError) {
        return NextResponse.json({ error: memberError.message || 'Failed to create member record' }, { status: 500 });
      }
    }
    
    // Create trainer record if trainer data is provided
    if (trainerData) {
      const { data: trainer, error: trainerError } = await supabaseServer()
        .from('trainers')
        .insert([{
          account_id: account.id,
          profile_id: account.id,
          specialization: trainerData.specialization || '',
          experience_years: trainerData.experienceYears || 0,
          bio: trainerData.bio || '',
          certification: trainerData.certification || '',
          hourly_rate: trainerData.hourlyRate || 0,
          status: 'active',
        }])
        .select()
        .single();
      
      if (trainerError) {
        return NextResponse.json({ error: trainerError.message || 'Failed to create trainer record' }, { status: 500 });
      }
    }
    
    // Return the complete user profile
    const { data: userProfile, error: userProfileError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('account_id', account.id)
      .single();
    
    if (userProfileError) {
      return NextResponse.json({ error: userProfileError.message || 'Failed to fetch user profile' }, { status: 500 });
    }
    
    return NextResponse.json(userProfile, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin using new user system
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
    
    const { accountId, profileData, accountData, memberData, trainerData } = await req.json();
    
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
          console.error('Account update error:', accountError);
          return NextResponse.json({ error: 'Failed to update account', details: accountError.message }, { status: 500 });
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
          console.error('Profile update error:', profileError);
          return NextResponse.json({ error: 'Failed to update profile', details: profileError.message }, { status: 500 });
        }
      }
    }
    
    // Update or create member record if member data is provided
    if (memberData) {
      const memberUpdates: Record<string, unknown> = {};
      if (memberData.memberNotes !== undefined) memberUpdates.member_notes = memberData.memberNotes;
      if (memberData.credit !== undefined) memberUpdates.credit = memberData.credit;
      if (memberData.status !== undefined) memberUpdates.status = memberData.status;
      
      // Check if member record exists
      const { data: existingMember } = await supabaseServer()
        .from('members')
        .select('id')
        .eq('account_id', accountId)
        .single();
      
      if (existingMember) {
        // Update existing member
        if (Object.keys(memberUpdates).length > 0) {
          const { error: memberError } = await supabaseServer()
            .from('members')
            .update(memberUpdates)
            .eq('account_id', accountId);
          
          if (memberError) {
            return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
          }
        }
      } else {
        // Create new member record
        const { error: memberError } = await supabaseServer()
          .from('members')
          .insert([{
            account_id: accountId,
            profile_id: accountId,
            member_notes: memberData.memberNotes || '',
            credit: memberData.credit || 0,
            status: memberData.status || 'active',
          }]);
        
        if (memberError) {
          return NextResponse.json({ error: 'Failed to create member record' }, { status: 500 });
        }
      }
    }
    
    // Update or create trainer record if trainer data is provided
    if (trainerData) {
      const trainerUpdates: Record<string, unknown> = {};
      if (trainerData.specialization !== undefined) trainerUpdates.specialization = trainerData.specialization;
      if (trainerData.experienceYears !== undefined) trainerUpdates.experience_years = trainerData.experienceYears;
      if (trainerData.bio !== undefined) trainerUpdates.bio = trainerData.bio;
      if (trainerData.certification !== undefined) trainerUpdates.certification = trainerData.certification;
      if (trainerData.hourlyRate !== undefined) trainerUpdates.hourly_rate = trainerData.hourlyRate;
      if (trainerData.status !== undefined) trainerUpdates.status = trainerData.status;
      
      // Check if trainer record exists
      const { data: existingTrainer } = await supabaseServer()
        .from('trainers')
        .select('id')
        .eq('account_id', accountId)
        .single();
      
      if (existingTrainer) {
        // Update existing trainer
        if (Object.keys(trainerUpdates).length > 0) {
          const { error: trainerError } = await supabaseServer()
            .from('trainers')
            .update(trainerUpdates)
            .eq('account_id', accountId);
          
          if (trainerError) {
            return NextResponse.json({ error: 'Failed to update trainer' }, { status: 500 });
          }
        }
      } else {
        // Create new trainer record
        const { error: trainerError } = await supabaseServer()
          .from('trainers')
          .insert([{
            account_id: accountId,
            profile_id: accountId,
            specialization: trainerData.specialization || '',
            experience_years: trainerData.experienceYears || 0,
            bio: trainerData.bio || '',
            certification: trainerData.certification || '',
            hourly_rate: trainerData.hourlyRate || 0,
            status: trainerData.status || 'active',
          }]);
        
        if (trainerError) {
          return NextResponse.json({ error: 'Failed to create trainer record' }, { status: 500 });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin using new user system
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
    
    const { accountId } = await req.json();
    
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

    // Delete from auth using the auth_user_id
    const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(account.auth_user_id);
    if (deleteAuthError) {
      return NextResponse.json({ error: 'Failed to delete user from auth' }, { status: 500 });
    }
    
    // First, unlink any members from this account (set account_id to NULL)
    const { error: unlinkMembersError } = await supabaseServer()
      .from('members')
      .update({ account_id: null })
      .eq('account_id', accountId);
    
    if (unlinkMembersError) {
      return NextResponse.json({ error: 'Failed to unlink members from account' }, { status: 500 });
    }
    
    // Manually delete the profile record (this will cascade to delete trainers)
    const { error: deleteProfileError } = await supabaseServer()
      .from('profiles')
      .delete()
      .eq('id', accountId);
    
    if (deleteProfileError) {
      return NextResponse.json({ error: 'Failed to delete profile record' }, { status: 500 });
    }
    
    // Manually delete the account record since there's no cascade from auth to accounts
    const { error: deleteAccountError } = await supabaseServer()
      .from('accounts')
      .delete()
      .eq('id', accountId);
    
    if (deleteAccountError) {
      return NextResponse.json({ error: 'Failed to delete account record' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
} 