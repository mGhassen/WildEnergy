import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    console.log('Session API called with token:', token ? 'present' : 'missing');
    
    if (!token) {
      console.log('No token provided in session API');
      return NextResponse.json({
        success: false,
        error: 'No token provided',
      }, { status: 401 });
    }

    // Get user from token
    console.log('Validating token with Supabase...');
    const { data: { user }, error: userError } = await supabaseServer().auth.getUser(token);
    
    if (userError) {
      console.log('Token validation error:', userError);
    }
    
    if (userError || !user) {
      console.log('Invalid or expired token');
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token',
      }, { status: 401 });
    }

    console.log('Token validated, user ID:', user.id);

    // Get user profile
    const { data: userData, error: dbError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (dbError) {
      console.log('Database error:', dbError);
    }

    if (dbError || !userData) {
      console.log('User profile not found for user ID:', user.id);
      return NextResponse.json({
        success: false,
        error: 'User profile not found',
        userId: user.id,
      }, { status: 404 });
    }

    console.log('User profile found, status:', userData.status);

    // Status checks
    if (userData.status === 'archived') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending approval. Please wait for admin approval.',
        status: 'archived',
      }, { status: 403 });
    }
    if (userData.status === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending confirmation. Please check your email for confirmation link.',
        status: 'pending',
      }, { status: 403 });
    }
    if (userData.status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
        status: 'suspended',
      }, { status: 403 });
    }

    // Return user info
    const userResponse = {
      id: userData.id,
      email: user.email || '',
      isAdmin: Boolean(userData.is_admin),
      firstName: userData.first_name || user.email?.split('@')[0] || 'User',
      lastName: userData.last_name || '',
      status: userData.status || 'active',
      credit: userData.credit ?? 0,
    };

    console.log('Session API returning user:', userResponse.id);
    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error: any) {
    console.error('Session API unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during session check',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 