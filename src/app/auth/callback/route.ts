import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    const userId = searchParams.get('user_id');

    console.log('Auth callback received:', { 
      type, 
      hasCode: !!code, 
      hasAccessToken: !!accessToken, 
      userId,
      error 
    });

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL(`/auth/login?error=oauth_error&message=${error}`, request.url));
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      // This is a password reset callback
      const redirectUrl = `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
      console.log('Redirecting to reset password page:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (type === 'signup' && accessToken && refreshToken) {
      // This is an invitation acceptance callback
      const redirectUrl = `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`;
      console.log('Redirecting to accept invitation page:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Handle Google OAuth callback with code
    if (code) {
      console.log('Google OAuth callback with code - redirecting to Supabase OAuth callback');
      
      // Redirect to Supabase's OAuth callback endpoint which handles the code exchange
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/oauth-success`;
      const state = searchParams.get('state') || '';
      
      // Redirect to Supabase's OAuth callback endpoint with state parameter
      const oauthCallbackUrl = `${supabaseUrl}/auth/v1/callback?code=${code}&state=${state}&redirect_to=${encodeURIComponent(redirectUrl)}`;
      
      return NextResponse.redirect(oauthCallbackUrl);
    }

    // Handle callback from Supabase OAuth (after code exchange)
    if (!code && !accessToken && !refreshToken) {
      console.log('Supabase OAuth callback - redirecting to success page');
      return NextResponse.redirect(new URL('/auth/oauth-success', request.url));
    }

    // Handle Google OAuth callback with tokens (legacy)
    if (accessToken && refreshToken && userId) {
      console.log('Google OAuth callback - storing tokens and redirecting');
      
      // Store tokens in a way that the client can access them
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('google_auth', 'success');
      redirectUrl.searchParams.set('access_token', accessToken);
      redirectUrl.searchParams.set('refresh_token', refreshToken);
      redirectUrl.searchParams.set('user_id', userId);
      
      return NextResponse.redirect(redirectUrl);
    }

    // Default fallback to login page
    console.log('No specific callback type, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback-failed', request.url));
  }
} 