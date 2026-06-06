import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (error) {
      return NextResponse.redirect(new URL(`/auth/login?error=oauth_error&message=${error}`, request.url));
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      const redirectUrl = `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (type === 'signup' && accessToken && refreshToken) {
      const redirectUrl = `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (code) {
      const { data, error: exchangeError } = await supabaseServer().auth.exchangeCodeForSession(code);

      if (!exchangeError && data.session) {
        const redirectUrl = new URL('/auth/oauth-success', request.url);
        redirectUrl.searchParams.set('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
        }
        return NextResponse.redirect(redirectUrl);
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const oauthSuccessUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/oauth-success`;
      const state = searchParams.get('state') || '';
      const oauthCallbackUrl = `${supabaseUrl}/auth/v1/callback?code=${code}&state=${state}&redirect_to=${encodeURIComponent(oauthSuccessUrl)}`;
      return NextResponse.redirect(oauthCallbackUrl);
    }

    if (accessToken) {
      const redirectUrl = new URL('/auth/oauth-success', request.url);
      redirectUrl.searchParams.set('access_token', accessToken);
      if (refreshToken) {
        redirectUrl.searchParams.set('refresh_token', refreshToken);
      }
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(new URL('/auth/login', request.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback-failed', request.url));
  }
} 