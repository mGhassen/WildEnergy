"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    // Get email from URL params if available
    const email = searchParams.get('email');
    if (email) {
      setUserEmail(email);
    }
  }, [searchParams]);

  // Check if we have the required tokens
  const hasValidTokens = searchParams.get('access_token') && searchParams.get('refresh_token');

  // Show error if no valid tokens
  if (!hasValidTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

  // Show loading while we validate the session
  if (!userEmail && hasValidTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Validating Reset Link</CardTitle>
            <CardDescription>
              Please wait while we validate your reset link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
      // Get the access token from URL (Supabase sends this in the reset link)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      if (!accessToken) {
        throw new Error('Invalid password reset link. Please request a new reset link.');
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

      // Get the user's email from the session
      const email = sessionData.session.user.email;
      if (email) {
        setUserEmail(email);
      }

      setSuccess(true);
      
      toast({
        title: "Password reset successfully!",
        description: "You will be automatically logged in...",
      });

      // Automatically log in the user after resetting password
      setTimeout(async () => {
        try {
          await login(email || '', password);
          // The useAuth hook will handle redirection
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          // Redirect to login page if auto-login fails
          router.push('/auth/login?message=password-reset-success');
        }
      }, 2000);

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
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Password Reset Complete!</CardTitle>
            <CardDescription>
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
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
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
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

          <form onSubmit={handleResetPassword} className="space-y-4">
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

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Make sure to choose a strong password that you can remember.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 