"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { consumePostLoginRedirect } from '@/lib/auth-return-path';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        localStorage.removeItem('account_status_email');
        localStorage.removeItem('pending_approval_email');
        localStorage.removeItem('pending_email');

        const supabase = createSupabaseClient();

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        const accessToken = sessionData.session?.access_token;
        const refreshToken = sessionData.session?.refresh_token || '';

        if (!accessToken) {
          throw new Error('No session found after OAuth flow. Please try signing in again.');
        }

        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        if (typeof window !== 'undefined') {
          (window as any).__authToken = accessToken;
        }

        const response = await fetch('/api/auth/oauth-complete', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.status === 'pending' || data.status === 'archived') {
            const pendingEmail = data.email || '';
            router.replace(
              pendingEmail
                ? `/auth/waiting-approval?email=${encodeURIComponent(pendingEmail)}`
                : '/auth/waiting-approval',
            );
            return;
          }
          throw new Error(data.error || 'Failed to complete OAuth sign-in');
        }
        window.dispatchEvent(new CustomEvent('auth-state-changed'));

        setStatus('success');
        setMessage(data.created ? 'Account created! Redirecting...' : 'Login successful! Redirecting...');

        setTimeout(() => {
          const next = consumePostLoginRedirect();
          if (next) {
            router.push(next);
          } else if (data.user?.isAdmin || data.user?.accessiblePortals?.includes('admin')) {
            router.push('/admin/dashboard');
          } else {
            router.push('/member');
          }
        }, 500);
      } catch (error: any) {
        console.error('OAuth success error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);

        setTimeout(() => {
          router.push('/auth/login?error=oauth_failed');
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
