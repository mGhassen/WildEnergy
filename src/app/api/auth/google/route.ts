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

    // If account doesn't exist, create it
    if (!account) {
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          email: data.user.email,
          first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: data.user.user_metadata?.last_name || data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          is_admin: false,
          status: 'active',
          user_type: 'member',
          accessible_portals: ['member'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Account creation error:', createError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login?error=account_creation_failed`
        );
      }

      // Create a redirect URL with the new account data
      const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('access_token', data.session.access_token);
      redirectUrl.searchParams.set('refresh_token', data.session.refresh_token || '');
      redirectUrl.searchParams.set('user_id', newAccount.id);
      
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
