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

    // Sign in with Supabase
    const { data: { session, user }, error } = await supabaseServer().auth.signInWithPassword({
      email,
      password,
    });

    if (error || !session || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password',
        details: error?.message,
      }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User account not found. Please sign up first.',
      }, { status: 401 });
    }

    // Check user status
    if (userProfile.status === 'archived') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending admin approval. Please wait for approval before logging in.',
      }, { status: 403 });
    }
    if (userProfile.status === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending invitation acceptance. Please check your email and accept the invitation.',
      }, { status: 403 });
    }
    if (userProfile.status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
      }, { status: 403 });
    }
    if (userProfile.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Account is not active. Please contact support.',
      }, { status: 403 });
    }

    // Return session and user info
    console.log('Login API returning session:', {
      access_token: session?.access_token ? 'present' : 'missing',
      refresh_token: session?.refresh_token ? 'present' : 'missing',
      expires_at: session?.expires_at,
    });
    
    return NextResponse.json({
      success: true,
      session,
      user: {
        id: userProfile.id,
        email: user.email || '',
        isAdmin: Boolean(userProfile.is_admin),
        firstName: userProfile.first_name || user.email?.split('@')[0] || 'User',
        lastName: userProfile.last_name || '',
        status: userProfile.status || 'active',
        credit: userProfile.credit ?? 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during login',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 