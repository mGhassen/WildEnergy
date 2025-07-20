import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    console.log('Auth callback received:', { type, hasAccessToken: !!accessToken });

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

    // Default fallback to login page
    console.log('No specific callback type, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback-failed', request.url));
  }
} 