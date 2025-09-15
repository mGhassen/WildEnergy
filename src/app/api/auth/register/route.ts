import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { mapMemberStatusToAccountStatus } from '@/lib/status-mapping';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({
        success: false,
        error: 'Email, password, and first name are required',
      }, { status: 400 });
    }

    // 1. Create auth user using service role with display name
    const { data: authData, error: authError } = await supabaseServer().auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || ''
        }
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json({
        success: false,
        error: authError?.message || 'Failed to create user',
      }, { status: 400 });
    }

    const authUserId = authData.user.id;
    
    try {
      // 2. Create profile record first
      const { data: profile, error: profileError } = await supabaseServer()
        .from('profiles')
        .insert({
          first_name: firstName,
          last_name: lastName || '',
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      // 3. Create account record with 'active' status
      const { error: accountError } = await supabaseServer()
        .from('accounts')
        .insert({
          id: authUserId,
          auth_user_id: authUserId, // Link to auth user
          email,
          status: 'active', // Users start with 'active' status
          is_admin: false,
          profile_id: profile.id, // Link to profile via foreign key
        });

      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }
      
      // 4. Create member record with active status
      const memberStatus = 'active'; // Active accounts have active members
      const { data: memberData, error: memberError } = await supabaseServer()
        .from('members')
        .insert({
          account_id: authUserId,
          profile_id: profile.id, // Use profile.id instead of authUserId
          member_notes: '',
          credit: 0,
          status: memberStatus,
        })
        .select('id')
        .single();

      if (memberError) {
        throw new Error(`Failed to create member record: ${memberError.message}`);
      }

      // 5. Account and member are both active - no additional updates needed
      
    } catch (error: any) {
      // Clean up auth user if any database operation fails
      await supabaseServer().auth.admin.deleteUser(authUserId);
      return NextResponse.json({
        success: false,
        error: 'Failed to create user profile',
        details: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully. Welcome to Wild Energy!',
      userId: authData.user.id,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
      },
      user: {
        id: authData.user.id,
        account_id: authData.user.id,
        email: authData.user.email,
        firstName: firstName,
        lastName: lastName || '',
        status: 'active',
        isAdmin: false,
        role: 'member',
        accessiblePortals: ['member'],
        member_id: memberData?.id || null,
        provider: 'email'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during registration',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 