import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
      }, { status: 400 });
    }

    console.log('Creating admin user in Supabase Auth:', email);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseServer().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        is_admin: true,
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({
        success: false,
        error: authError?.message || 'Failed to create auth user',
      }, { status: 400 });
    }

    console.log('Auth user created:', authData.user.id);

    // 2. Update the existing user profile to link with the auth user
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({ 
        auth_user_id: authData.user.id,
        status: 'active'
      })
      .eq('email', email);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Clean up auth user if profile update fails
      await supabaseServer().auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to update user profile',
        details: updateError.message,
      }, { status: 500 });
    }

    console.log('User profile updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: 'Admin',
        lastName: 'User',
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create admin user',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 