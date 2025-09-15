"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowLeft, RefreshCw, CheckCircle, User, CreditCard } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function WaitingApprovalPage() {
  const { checkAccountStatus, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const { toast } = useToast();

  const handleCheckStatus = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await checkAccountStatus(user.email);
      
      if (data.success) {
        setStatus(data.status || "pending");
        
        // If user is active, redirect to dashboard
        if (data.status === 'active') {
          toast({
            title: "Account Approved!",
            description: "Your account has been approved. You can now access all features.",
          });
          setTimeout(() => {
            window.location.href = '/member';
          }, 2000);
        }
      } else {
        console.error('Failed to check status:', data.error);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      toast({
        title: "Error",
        description: "Failed to check account status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Clean up localStorage
    localStorage.removeItem('pending_email');
    localStorage.removeItem('pending_approval_email');
    localStorage.removeItem('account_status_email');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-base">
            Your account is waiting for admin approval. While you wait, you can explore available plans and update your profile.
            {user?.email && (
              <span className="block mt-2 text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {user.email}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-6 rounded-xl border-2 bg-muted/50 border-border">
              <h3 className="font-bold text-lg mb-3 text-foreground">
                What happens next:
              </h3>
              <ol className="text-sm space-y-2 text-left text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    1
                  </span>
                  <span>Admin reviews your account</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    2
                  </span>
                  <span>You'll receive an approval notification</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    3
                  </span>
                  <span>You can then access all portal features</span>
                </li>
              </ol>
            </div>
            
            <div className="text-sm text-orange-600 bg-orange-100 p-3 rounded-lg border border-orange-200">
              <p>⏰ <strong>Note:</strong> This usually takes 24-48 hours. You can check back periodically to see if your account has been approved.</p>
            </div>

            {/* Available actions for pending users */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <User className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold text-sm mb-1">Update Profile</h4>
                  <p className="text-xs text-muted-foreground mb-3">Complete your personal information</p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/member/profile">
                      View Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-semibold text-sm mb-1">View Plans</h4>
                  <p className="text-xs text-muted-foreground mb-3">Explore available subscription plans</p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/member/plans">
                      View Plans
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleCheckStatus} 
              disabled={isLoading || !user?.email}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Approval Status
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              asChild 
              className="w-full" 
              onClick={handleBackToLogin}
            >
              <Link href="/auth/login">
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
