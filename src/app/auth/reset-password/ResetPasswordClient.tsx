"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, CheckCircle, Loader2, Clock, Dumbbell } from 'lucide-react';

export default function ResetPasswordClient({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Unwrap searchParams Promise (Next.js 15+)
  // @ts-ignore
  const params = use(searchParams);
  const emailRaw = params.email;
  const emailFromParams = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;

  // All hooks at the top
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tokens, setTokens] = useState<{ access_token?: string; refresh_token?: string }>({});
  const [isClient, setIsClient] = useState(false);
  const [userEmail, setUserEmail] = useState(emailFromParams || '');

  useEffect(() => {
    setIsClient(true);
    // Extract tokens from hash (preferred) or query string (fallback)
    if (typeof window !== 'undefined') {
      let access_token, refresh_token;
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        access_token = params.get('access_token') || undefined;
        refresh_token = params.get('refresh_token') || undefined;
      } else {
        const search = window.location.search;
        if (search) {
          const params = new URLSearchParams(search);
          access_token = params.get('access_token') || undefined;
          refresh_token = params.get('refresh_token') || undefined;
        }
      }
      setTokens({ access_token, refresh_token });
    }
  }, [params]);

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
  }, [cooldownEndTime]);

  // Derived value for cooldown
  const isInCooldown = !!cooldownEndTime && Date.now() < (cooldownEndTime || 0);

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  if (!isClient) {
    // Always render a Card skeleton to prevent hydration errors
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-4" />
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if we have the required tokens
  const hasValidTokens = tokens.access_token && tokens.refresh_token;

  // Show error if no valid tokens
  if (!hasValidTokens) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-muted-foreground text-center">
              <p>Please request a new password reset link.</p>
            </div>
            <Button 
              className="w-full"
              onClick={() => router.push('/auth/forgot-password')}
            >
              Request New Reset Link
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
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
      // Always use tokens from hash or query string
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      if (!accessToken) {
        throw new Error('Invalid reset link. Please request a new password reset.');
      }

      // Update the user's password using Supabase
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      
      // Set the session from the reset tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError || !sessionData.session) {
        throw new Error('Invalid or expired password reset link');
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log('Password updated successfully');

      // Get the user's email from the session and store it for auto-login
      const sessionEmail = sessionData.session.user.email;
      if (sessionEmail) {
        setUserEmail(sessionEmail);
      }

      console.log('Session email extracted:', sessionEmail);

      setSuccess(true);
      
      toast({
        title: "Password reset successfully!",
        description: "You will be automatically logged in...",
      });

      // After password is reset, log in directly using the login API and store tokens
      setTimeout(async () => {
        try {
          console.log('Starting auto-login process...');
          console.log('User email for login:', sessionEmail);
          console.log('Password length:', password.length);
          
          if (!sessionEmail) {
            throw new Error('No email available for auto-login');
          }
          
          console.log('Login data being sent:', { email: sessionEmail, passwordLength: password.length });
          
          // Use the auth hook for login
          await login(sessionEmail, password);
          
          // The auth hook handles token storage
          
          console.log('Login successful, redirecting...');
          // The auth hook will handle user session and redirect
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          router.push('/auth/login?message=password-reset-success');
        }
      }, 3000);

    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
      
      // Set cooldown on error to prevent rapid retries
      const newSubmitCount = submitCount + 1;
      setSubmitCount(newSubmitCount);
      
      const cooldownDuration = Math.min(30 * newSubmitCount, 120); // 30s, 60s, 90s, 120s max
      const endTime = Date.now() + (cooldownDuration * 1000);
      setCooldownEndTime(endTime);
      
      toast({
        title: "Error",
        description: err.message || 'Failed to reset password',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Complete!</CardTitle>
            <CardDescription>Your password has been successfully updated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Logging you in...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
            {emailFromParams && (
              <div className="mt-2 text-sm text-muted-foreground">
                Account: {emailFromParams}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
              <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                  Resetting Password...
                </>
              ) : isInCooldown ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Wait {formatTimeRemaining(timeRemaining)}
                </>
              ) : (
                'Reset Password & Continue'
              )}
            </Button>
          </form>
          {isInCooldown && (
            <div className="text-xs text-muted-foreground text-center">
              <p>Please wait before trying again to prevent abuse.</p>
            </div>
          )}
          <div className="text-center">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 