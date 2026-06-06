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

    const redirectUrl = new URL('/auth/oauth-success', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('access_token', data.session.access_token);
    if (data.session.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
    }

    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Google OAuth handler error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=server_error`
    );
  }
}
