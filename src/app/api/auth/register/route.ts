import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
      // 2. Create account record with 'archived' status (waiting for admin approval)
      const { error: accountError } = await supabaseServer()
        .from('accounts')
        .insert({
          id: authUserId,
          email,
          status: 'archived', // Users with passwords start with 'archived' status
          is_admin: false,
        });

      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }
      
      // 3. Create profile record
      const { error: profileError } = await supabaseServer()
        .from('profiles')
        .insert({
          id: authUserId,
          first_name: firstName,
          last_name: lastName || '',
        });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      // 4. Create member record (since this is a registration, they're registering as a member)
      const { error: memberError } = await supabaseServer()
        .from('members')
        .insert({
          account_id: authUserId,
          profile_id: authUserId,
          member_notes: '',
          credit: 0,
          status: 'active',
        });

      if (memberError) {
        throw new Error(`Failed to create member record: ${memberError.message}`);
      }
      
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
      message: 'User registered successfully. Your account is pending admin approval.',
      userId: authData.user.id,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during registration',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 