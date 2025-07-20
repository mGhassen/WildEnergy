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

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseServer().auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({
        success: false,
        error: authError?.message || 'Failed to create user',
      }, { status: 400 });
    }

    // 2. Create user profile
    const { error: profileError } = await supabaseServer()
      .from('users')
      .insert([
        {
          auth_user_id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName || '',
          is_admin: false,
          is_member: true,
          status: 'active', // Set to active for testing
          subscription_status: 'inactive',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create user profile',
        details: profileError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        lastName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create test user',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 