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

    // Get user profile from new user system by email (since account_id doesn't match auth user ID)
    const { data: userData, error: dbError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('email', user.email)
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

    console.log('User profile found, account status:', userData.account_status);

    // Status checks - allow pending users to access their data
    if (userData.account_status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
        status: 'suspended',
      }, { status: 403 });
    }

    // Determine authentication provider
    const provider = user.app_metadata?.provider || 'email';
    
    // Return user info
    const userResponse = {
      id: userData.account_id,
      account_id: userData.account_id,
      email: user.email || '',
      profileEmail: userData.profile_email || '', // Contact email
      isAdmin: Boolean(userData.is_admin),
      firstName: userData.first_name || user.email?.split('@')[0] || 'User',
      lastName: userData.last_name || '',
      phone: userData.phone || '',
      age: userData.date_of_birth ? new Date().getFullYear() - new Date(userData.date_of_birth).getFullYear() : 0,
      profession: userData.profession || '',
      address: userData.address || '',
      status: userData.account_status || 'active',
      credit: userData.credit ?? 0,
      role: userData.user_type === 'admin' || userData.user_type === 'admin_member' || userData.user_type === 'admin_trainer' || userData.user_type === 'admin_member_trainer' ? 'admin' : 'member',
      userType: userData.user_type,
      accessiblePortals: userData.accessible_portals,
      member_id: userData.member_id,
      trainer_id: userData.trainer_id,
      provider: provider,
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