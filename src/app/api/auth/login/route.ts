import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
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
    const { data: userProfile, error: profileError } = await supabase
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
    if (userProfile.status === 'onhold') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending approval. Please wait for admin approval.',
      }, { status: 403 });
    }
    if (userProfile.status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
      }, { status: 403 });
    }

    // Return session and user info
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