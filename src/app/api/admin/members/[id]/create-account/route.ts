import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { mapMemberStatusToAccountStatus } from '@/lib/status-mapping';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    
    // Verify admin access
    const authHeader = req.headers.get('authorization');
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

    // Get member data with profile information
    const { data: memberData, error: memberError } = await supabaseServer()
      .from('members')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          phone,
          profile_email,
          date_of_birth,
          address,
          profession,
          emergency_contact_name,
          emergency_contact_phone,
          profile_image_url
        )
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if member already has an account
    if (memberData.account_id) {
      return NextResponse.json({ error: 'Member already has an account' }, { status: 400 });
    }

    const { email, password, isAdmin = false } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabaseServer().auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          first_name: memberData.profiles.first_name,
          last_name: memberData.profiles.last_name
        }
      }
    });

    if (signUpError || !authData.user) {
      return NextResponse.json({ error: signUpError?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const authUserId = authData.user.id;

    try {
      // Get member status to sync with account status
      const memberStatus = memberData.status || 'active';
      const accountStatus = mapMemberStatusToAccountStatus(memberStatus);

      // Create account record with foreign key to existing profile
      const { data: account, error: accountError } = await supabaseServer()
        .from('accounts')
        .insert({
          id: authUserId,
          auth_user_id: authUserId,
          email,
          status: accountStatus,
          is_admin: isAdmin,
          profile_id: memberData.profile_id, // Link to existing profile
        })
        .select()
        .single();

      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }

      // Update member record to link to the new account
      const { error: memberUpdateError } = await supabaseServer()
        .from('members')
        .update({ account_id: authUserId })
        .eq('id', memberId);

      if (memberUpdateError) {
        throw new Error(`Failed to link member to account: ${memberUpdateError.message}`);
      }

      // Return the complete user profile
      const { data: userProfile, error: userProfileError } = await supabaseServer()
        .from('user_profiles')
        .select('*')
        .eq('account_id', authUserId)
        .single();

      if (userProfileError) {
        return NextResponse.json({ error: userProfileError.message || 'Failed to fetch user profile' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully for member',
        user: userProfile
      }, { status: 201 });

    } catch (error: any) {
      // Clean up auth user if database operations failed
      await supabaseServer().auth.admin.deleteUser(authUserId);
      return NextResponse.json({
        success: false,
        error: 'Failed to create account',
        details: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create account from member',
      details: error.message
    }, { status: 500 });
  }
}
