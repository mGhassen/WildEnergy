"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';

export default function AcceptInvitationClient({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tokens, setTokens] = useState<{ access_token?: string; refresh_token?: string }>({});

  useEffect(() => {
    // Get email from searchParams if available (for display only)
    const emailRaw = searchParams.email;
    const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
    if (email) {
      setUserEmail(email);
    }
    // Extract tokens from URL hash (preferred for Supabase invite flow)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        setTokens({
          access_token: params.get('access_token') || undefined,
          refresh_token: params.get('refresh_token') || undefined,
        });
        return;
      }
    }
    // Fallback: try to get tokens from searchParams (legacy/edge case)
    const accessTokenRaw = searchParams.access_token;
    const refreshTokenRaw = searchParams.refresh_token;
    setTokens({
      access_token: Array.isArray(accessTokenRaw) ? accessTokenRaw[0] : accessTokenRaw,
      refresh_token: Array.isArray(refreshTokenRaw) ? refreshTokenRaw[0] : refreshTokenRaw,
    });
  }, [searchParams]);

  // Check if user is in cooldown
  const isInCooldown = !!cooldownEndTime && Date.now() < (cooldownEndTime || 0);

  // Update countdown timer
  useEffect(() => {
    if (!isInCooldown) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, cooldownEndTime! - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setCooldownEndTime(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isInCooldown, cooldownEndTime]);

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isInCooldown) {
      toast({
        title: "Please wait",
        description: `Try again in ${formatTimeRemaining(timeRemaining)}`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Always use tokens from URL hash (preferred) or fallback
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      if (!accessToken) {
        throw new Error('Invalid invitation link. Please request a new invitation.');
      }

      // Update the user's password using Supabase
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      
      // Set the session from the invitation tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError || !sessionData.session) {
        throw new Error('Invalid or expired invitation link');
      }

      // Update the user's password and display name
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          first_name: sessionData.session.user.user_metadata?.first_name || '',
          last_name: sessionData.session.user.user_metadata?.last_name || ''
        }
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update user status to 'active' after accepting invitation
      const { error: statusError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('auth_user_id', sessionData.session.user.id);

      if (statusError) {
        console.error('Failed to update user status:', statusError);
        // Don't throw error here, as the password was set successfully
      }

      // Get the user's email from the session
      const email = sessionData.session.user.email;
      if (email) {
        setUserEmail(email);
      }

      setSuccess(true);
      
      toast({
        title: "Password set successfully!",
        description: "You will be automatically logged in...",
      });

      // After password is set, log in directly using the login API and store tokens
      setTimeout(async () => {
        try {
          if (!email) {
            throw new Error('No email available for auto-login');
          }
          // Use the auth hook for login
          await login(email, password);
          
          // The auth hook will handle token storage and redirect
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          router.push('/auth/login?message=password-set-success');
        }
      }, 2000);

    } catch (err: any) {
      console.error('Accept invitation error:', err);
      setError(err.message || 'Failed to accept invitation');
      
      // Set cooldown on error to prevent rapid retries
      const newSubmitCount = submitCount + 1;
      setSubmitCount(newSubmitCount);
      
      const cooldownDuration = Math.min(30 * newSubmitCount, 120); // 30s, 60s, 90s, 120s max
      const endTime = Date.now() + (cooldownDuration * 1000);
      setCooldownEndTime(endTime);
      
      toast({
        title: "Error",
        description: err.message || 'Failed to accept invitation',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Welcome to Wild Energy!</CardTitle>
          <CardDescription>
            Your account has been successfully activated
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Logging you in...</span>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Set Your Password</CardTitle>
        <CardDescription>
          Welcome to Wild Energy! Please set a password for your account.
          {userEmail && (
            <div className="mt-2 text-sm text-muted-foreground">
              Account: {userEmail}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isInCooldown}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting Password...
              </>
            ) : isInCooldown ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Wait {formatTimeRemaining(timeRemaining)}
              </>
            ) : (
              'Set Password & Continue'
            )}
          </Button>
        </form>

        {isInCooldown && (
          <div className="text-xs text-muted-foreground text-center">
            <p>Please wait before trying again to prevent abuse.</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/auth/login')}
          >
            Back to Login
          </Button>
        </div>
      </CardContent>
    </>
  );
} 