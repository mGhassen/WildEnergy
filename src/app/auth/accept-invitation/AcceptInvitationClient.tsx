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

  useEffect(() => {
    // Get email from searchParams if available
    const emailRaw = searchParams.email;
    const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
    if (email) {
      setUserEmail(email);
    }
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
      // Get the access token from searchParams (Supabase sends this in the invitation link)
      const accessTokenRaw = searchParams.access_token;
      const refreshTokenRaw = searchParams.refresh_token;
      const accessToken = Array.isArray(accessTokenRaw) ? accessTokenRaw[0] : accessTokenRaw;
      const refreshToken = Array.isArray(refreshTokenRaw) ? refreshTokenRaw[0] : refreshTokenRaw;
      
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
        title: "Password set successfully!",
        description: "You will be automatically logged in...",
      });

      // Automatically log in the user after setting password
      setTimeout(async () => {
        try {
          await login(email || '', password);
          // The useAuth hook will handle redirection
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          // Redirect to login page if auto-login fails
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
      <div className="container mx-auto p-6 max-w-md">
        <Card>
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
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
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
      </Card>
    </div>
  );
} 