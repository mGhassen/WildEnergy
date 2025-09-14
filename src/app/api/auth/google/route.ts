import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=oauth_error`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=no_code`
      );
    }

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=exchange_failed`
      );
    }

    if (!data.session || !data.user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=no_session`
      );
    }

    // Check if user exists in your accounts table
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', data.user.email)
      .single();

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('Account lookup error:', accountError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=account_lookup_failed`
      );
    }

    // If account doesn't exist, redirect to registration with pre-filled data
    if (!account) {
      console.log('New Google user - redirecting to registration with pre-filled data');
      
      // Store Google user data temporarily for registration
      const googleUserData = {
        email: data.user.email,
        first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: data.user.user_metadata?.last_name || data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
        google_id: data.user.id
      };

      // Store the data in a temporary way (you could use a database table or session storage)
      // For now, we'll pass it via URL parameters
      const redirectUrl = new URL('/auth/register', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('google_auth', 'true');
      if (googleUserData.email) redirectUrl.searchParams.set('email', googleUserData.email);
      if (googleUserData.first_name) redirectUrl.searchParams.set('first_name', googleUserData.first_name);
      if (googleUserData.last_name) redirectUrl.searchParams.set('last_name', googleUserData.last_name);
      if (googleUserData.avatar_url) redirectUrl.searchParams.set('avatar_url', googleUserData.avatar_url);
      if (googleUserData.google_id) redirectUrl.searchParams.set('google_id', googleUserData.google_id);
      redirectUrl.searchParams.set('access_token', data.session.access_token);
      redirectUrl.searchParams.set('refresh_token', data.session.refresh_token || '');
      
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Account exists, redirect with session data
    const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('access_token', data.session.access_token);
    redirectUrl.searchParams.set('refresh_token', data.session.refresh_token || '');
    redirectUrl.searchParams.set('user_id', account.id);
    
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Google OAuth handler error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=server_error`
    );
  }
}
