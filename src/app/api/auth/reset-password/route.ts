import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { createSupabaseClient } = await import('@/lib/supabase');
    const supabase = createSupabaseClient();

    // Use direct reset-password route (same as accept invitation flow)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/auth/reset-password`;

    console.log('Sending password reset email to:', email);
    console.log('Redirect URL:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('Password reset email sent successfully to:', email);

    return NextResponse.json(
      { message: 'Password reset email sent successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 