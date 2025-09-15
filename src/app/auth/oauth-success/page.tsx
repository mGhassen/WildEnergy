"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        console.log('Processing OAuth success');

        const supabase = createSupabaseClient();
        
        // Wait a moment for Supabase to process the OAuth flow
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the current session - Supabase should have already processed the OAuth flow
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!sessionData.session || !sessionData.session.user) {
          console.log('No session found, trying alternative methods...');
          
          // Try to get the session from the URL hash (Supabase sometimes puts it there)
          const hash = window.location.hash;
          if (hash) {
            console.log('Found hash, trying to process...');
            // Supabase might have put the session in the URL hash
            // Let's try to refresh the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshData.session && refreshData.user) {
              console.log('Session refreshed:', refreshData.user.email);
              await processUserSession(refreshData.session);
              return;
            }
          }

          // Try to get the user directly
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userData.user && !userError) {
            console.log('User found directly:', userData.user.email);
            // Create a mock session object
            const mockSession = {
              user: userData.user,
              access_token: '', // We'll get this from the session later
            };
            await processUserSession(mockSession);
            return;
          }

          throw new Error('No session found after OAuth flow. Please try signing in again.');
        }

        console.log('OAuth session found:', sessionData.session.user.email);
        await processUserSession(sessionData.session);
      } catch (error: any) {
        console.error('OAuth success error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
        
        setTimeout(() => {
          router.push('/auth/login?error=oauth_failed');
        }, 3000);
      }
    };

    const processUserSession = async (session: any) => {
      try {
        console.log('Processing user session:', session.user.email);

        const supabase = createSupabaseClient();

        // Store the session token
        if (session.access_token) {
          localStorage.setItem('access_token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('refresh_token', session.refresh_token);
          }
          if (typeof window !== 'undefined') {
            (window as any).__authToken = session.access_token;
          }
        } else {
          // If we don't have an access token, try to get the current session
          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession.session?.access_token) {
            localStorage.setItem('access_token', currentSession.session.access_token);
            if (currentSession.session.refresh_token) {
              localStorage.setItem('refresh_token', currentSession.session.refresh_token);
            }
            if (typeof window !== 'undefined') {
              (window as any).__authToken = currentSession.session.access_token;
            }
          }
        }

        // Check if user exists in our accounts table
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (accountError && accountError.code !== 'PGRST116') {
          console.error('Account lookup error:', accountError);
          throw new Error('Failed to look up account');
        }

                if (account) {
                  // User exists, redirect to appropriate portal
                  console.log('Existing user found, redirecting to portal');
                  setStatus('success');
                  setMessage('Login successful! Redirecting...');
                  
                  setTimeout(() => {
                    // Store email for account status checking
                    localStorage.setItem('account_status_email', account.email);
                    
                    // Trigger authentication state refresh
                    window.dispatchEvent(new CustomEvent('auth-state-changed'));
                    
                    // Redirect based on account status
                    if (account.status === 'pending') {
                      router.push('/auth/waiting-approval');
                    } else if (account.is_admin) {
                      router.push('/admin');
                    } else {
                      // Existing users go to member portal (onboarding check will happen there)
                      router.push('/member');
                    }
                  }, 1000);
        } else {
          // User doesn't exist, create account and profile
          console.log('New user, creating account and profile');
          setMessage('Creating your account...');
          
          // First create the profile
          const profileData = {
            first_name: session.user.user_metadata?.full_name?.split(' ')[0] || '',
            last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            profile_image_url: session.user.user_metadata?.avatar_url || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Creating profile with data:', profileData);

          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();

          if (profileError) {
            console.error('Profile creation error details:', {
              error: profileError,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              code: profileError.code
            });
            throw new Error(`Failed to create profile: ${profileError.message || 'Unknown error'}`);
          }

          // Then create the account with the profile_id
          const accountData = {
            auth_user_id: session.user.id,
            email: session.user.email,
            profile_id: newProfile.id,
            is_admin: false,
            status: 'active', // OAuth users are automatically active
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Creating account with data:', accountData);

          const { data: newAccount, error: createError } = await supabase
            .from('accounts')
            .insert(accountData)
            .select()
            .single();

          if (createError) {
            console.error('Account creation error details:', {
              error: createError,
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code
            });
            throw new Error(`Failed to create account: ${createError.message || 'Unknown error'}`);
          }

          // Finally create the member record
          const memberData = {
            account_id: newAccount.id,
            profile_id: newProfile.id,
            member_notes: '',
            status: 'active',
            credit: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('Creating member with data:', memberData);
          console.log('Account ID:', newAccount.id);
          console.log('Profile ID:', newProfile.id);

          const { data: newMember, error: memberError } = await supabase
            .from('members')
            .insert(memberData)
            .select()
            .single();

          if (memberError) {
            console.error('Member creation error details:', {
              error: memberError,
              message: memberError.message,
              details: memberError.details,
              hint: memberError.hint,
              code: memberError.code,
              fullError: JSON.stringify(memberError, null, 2)
            });
            throw new Error(`Failed to create member: ${memberError.message || 'Unknown error'}`);
          }

          console.log('Account, profile, and member created successfully:', newAccount.email);
          setStatus('success');
          setMessage('Account created! Redirecting...');
          
          setTimeout(() => {
            // Store email for account status checking
            localStorage.setItem('account_status_email', newAccount.email);
            
            // Trigger authentication state refresh
            window.dispatchEvent(new CustomEvent('auth-state-changed'));
            
            // Redirect based on account status - OAuth users are automatically active
            if (newAccount.is_admin) {
              router.push('/admin');
            } else {
              router.push('/member');
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error('Error processing user session:', error);
        setStatus('error');
        setMessage(`Session processing failed: ${error.message}`);
        
        setTimeout(() => {
          router.push('/auth/login?error=session_failed');
        }, 3000);
      }
    };

    handleOAuthSuccess();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Google Authentication</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your authentication...'}
            {status === 'success' && 'Authentication successful!'}
            {status === 'error' && 'Authentication failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <p className="text-sm text-red-600">{message}</p>
              <p className="text-xs text-gray-500">Redirecting to login page...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
