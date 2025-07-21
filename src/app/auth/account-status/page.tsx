"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type AccountStatus = 'pending' | 'archived' | 'suspended' | 'active' | 'unknown';

interface StatusConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  instructions: string[];
  actionText: string;
  actionHandler: () => void;
  showResendButton?: boolean;
}

function AccountStatusContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<AccountStatus>('unknown');
  const [authStatus, setAuthStatus] = useState<string>('unknown');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Get email from URL parameters or localStorage
    const emailFromUrl = searchParams.get('email');
    const emailFromStorage = localStorage.getItem('account_status_email');
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
      localStorage.setItem('account_status_email', emailFromUrl);
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
  }, [searchParams]);

  // Check user status on component mount
  useEffect(() => {
    if (email && isInitialLoad) {
      checkUserStatus();
      setIsInitialLoad(false);
    }
  }, [email, isInitialLoad]);

  const checkUserStatus = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus(data.status as AccountStatus);
        setAuthStatus(data.authStatus);
        
        // If user is active, redirect to login
        if (data.status === 'active') {
          toast({
            title: "Account Ready!",
            description: "Your account is now active. You can log in.",
          });
          setTimeout(() => {
            handleBackToLogin();
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        console.error('Failed to check status:', data.error);
        // Set default status if check fails
        setStatus('unknown');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      setStatus('unknown');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Email Sent",
          description: "Confirmation email has been resent. Please check your inbox.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to resend email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to resend email:', error);
      toast({
        title: "Error",
        description: "Failed to resend email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    await checkUserStatus();
  };

  const handleBackToLogin = () => {
    // Clean up localStorage
    localStorage.removeItem('pending_email');
    localStorage.removeItem('pending_approval_email');
    localStorage.removeItem('account_status_email');
  };

  const getStatusConfig = (): StatusConfig => {
    // Determine the actual status based on both user status and auth confirmation
    let effectiveStatus = status;
    
    // If user status is 'pending' but email is confirmed, they're waiting for admin approval
    if (status === 'pending' && authStatus === 'confirmed') {
      effectiveStatus = 'archived';
    }
    // If user status is 'archived' but email is not confirmed, they need to confirm email first
    else if (status === 'archived' && authStatus === 'unconfirmed') {
      effectiveStatus = 'pending';
    }

    switch (effectiveStatus) {
      case 'pending':
        return {
          icon: <Mail className="w-6 h-6 text-blue-600" />,
          title: "Confirm Your Email",
          description: "We've sent you a confirmation email to complete your account setup.",
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          instructions: [
            "1. Check your email inbox",
            "2. Click the confirmation link in the email",
            "3. Set your password and complete setup",
            "4. Return here to log in"
          ],
          actionText: "Resend Confirmation Email",
          actionHandler: handleResendEmail,
          showResendButton: true
        };
      
      case 'archived':
        return {
          icon: <Clock className="w-6 h-6 text-amber-600" />,
          title: "Account Pending Approval",
          description: "Your email has been confirmed. Your account is now waiting for admin approval.",
          color: "text-amber-600",
          bgColor: "bg-amber-100",
          instructions: [
            "1. Admin reviews your account",
            "2. You'll receive an approval notification",
            "3. You can then log in to your account"
          ],
          actionText: "Check Approval Status",
          actionHandler: handleCheckStatus
        };
      
      case 'suspended':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600" />,
          title: "Account Suspended",
          description: "Your account has been suspended. Please contact support for assistance.",
          color: "text-red-600",
          bgColor: "bg-red-100",
          instructions: [
            "1. Contact support at support@wildenergy.gym",
            "2. Provide your account details",
            "3. Wait for support to review your case"
          ],
          actionText: "Contact Support",
          actionHandler: () => window.open('mailto:support@wildenergy.gym', '_blank')
        };
      
      default:
        return {
          icon: <Mail className="w-6 h-6 text-gray-600" />,
          title: "Account Status",
          description: "Please check your account status to proceed.",
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          instructions: [
            "1. Check your account status",
            "2. Follow the instructions provided",
            "3. Contact support if needed"
          ],
          actionText: "Check Status",
          actionHandler: handleCheckStatus
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Determine the effective status for styling
  const getEffectiveStatus = () => {
    if (status === 'pending' && authStatus === 'confirmed') return 'archived';
    if (status === 'archived' && authStatus === 'unconfirmed') return 'pending';
    return status;
  };

  const effectiveStatus = getEffectiveStatus();

  // Show loading state while checking status
  if (isInitialLoad && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Checking account status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      effectiveStatus === 'pending' 
        ? 'bg-gradient-to-br from-blue-50 to-indigo-100' 
        : effectiveStatus === 'archived'
        ? 'bg-gradient-to-br from-amber-50 to-orange-100'
        : 'bg-gradient-to-br from-primary/5 to-secondary/5'
    }`}>
      <Card className={`w-full max-w-md ${
        effectiveStatus === 'pending' 
          ? 'border-blue-200 shadow-blue-100' 
          : effectiveStatus === 'archived'
          ? 'border-amber-200 shadow-amber-100'
          : ''
      }`}>
        <CardHeader className="text-center">
          <div className={`mx-auto w-16 h-16 ${statusConfig.bgColor} rounded-full flex items-center justify-center mb-4 shadow-lg`}>
            {statusConfig.icon}
          </div>
          <CardTitle className={`text-2xl font-bold ${statusConfig.color}`}>
            {statusConfig.title}
          </CardTitle>
          <CardDescription className="text-base">
            {statusConfig.description}
            {email && (
              <span className="block mt-2 text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {email}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className={`p-6 rounded-xl border-2 ${
              effectiveStatus === 'pending' 
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                : effectiveStatus === 'archived'
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                : 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
            }`}>
              <h3 className={`font-bold text-lg mb-3 ${
                effectiveStatus === 'pending' 
                  ? 'text-blue-900 dark:text-blue-100' 
                  : effectiveStatus === 'archived'
                  ? 'text-amber-900 dark:text-amber-100'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                What to do next:
              </h3>
              <ol className={`text-sm space-y-2 text-left ${
                effectiveStatus === 'pending' 
                  ? 'text-blue-800 dark:text-blue-200' 
                  : effectiveStatus === 'archived'
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {statusConfig.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      effectiveStatus === 'pending' 
                        ? 'bg-blue-200 text-blue-800' 
                        : effectiveStatus === 'archived'
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            {effectiveStatus === 'pending' && (
              <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p>💡 <strong>Tip:</strong> Didn't receive the email? Check your spam folder or try resending.</p>
              </div>
            )}
            
            {effectiveStatus === 'archived' && (
              <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p>⏰ <strong>Note:</strong> This usually takes 24-48 hours. You can check back periodically to see if your account has been approved.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={statusConfig.actionHandler} 
              disabled={isLoading || !email}
              className={`w-full ${
                effectiveStatus === 'pending' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                  : effectiveStatus === 'archived'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                  : ''
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {effectiveStatus === 'pending' ? 'Resending...' : 'Checking...'}
                </>
              ) : (
                <>
                  {effectiveStatus === 'pending' ? <Mail className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  {statusConfig.actionText}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              asChild 
              className="w-full" 
              onClick={handleBackToLogin}
            >
              <Link href="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>Need help? Contact support at <span className="font-mono">support@wildenergy.gym</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AccountStatusContent />
    </Suspense>
  );
} 