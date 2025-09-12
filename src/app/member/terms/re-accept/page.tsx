"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTerms } from "@/hooks/useTerms";
import { useReAcceptTerms } from "@/hooks/useMemberOnboarding";
import { useOnboardingStatus } from "@/hooks/useMemberOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Loader2,
  ArrowLeft
} from "lucide-react";
import { FormSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatDate } from "@/lib/date";

export default function TermsReAcceptance() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Get member ID from user
  const memberId = user?.member_id;
  
  // Fetch current terms and onboarding status
  const { data: termsData, isLoading: termsLoading, error: termsError } = useTerms();
  const { data: onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus();
  const reAcceptTermsMutation = useReAcceptTerms();

  // Check if member needs to re-accept terms
  const needsReAcceptance = onboardingStatus?.data && termsData && 
    onboardingStatus.data.terms_version_id !== termsData.id;

  // No auto-redirect - let the user manually re-accept terms

  const handleTermsChange = (checked: boolean) => {
    if (!hasScrolledToBottom) {
      toast({
        title: "Please read the terms",
        description: "You must read the entire terms and conditions before accepting them.",
        variant: "destructive",
      });
      return;
    }
    
    setTermsAccepted(checked);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      toast({
        title: "Thank you!",
        description: "You can now accept the updated terms and conditions.",
        variant: "default",
      });
    }
  };

  const handleReAccept = async () => {
    if (!termsAccepted) {
      toast({
        title: "Acceptance required",
        description: "You must accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      await reAcceptTermsMutation.mutateAsync();
      setShowSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.replace('/member');
      }, 2000);
    } catch (error) {
      console.error('Error re-accepting terms:', error);
    }
  };

  // Loading state
  if (termsLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground">Please log in to view this page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (termsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-destructive">Error loading terms. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show success state after re-accepting terms
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Terms Successfully Updated</h2>
                <p className="text-muted-foreground mb-4">
                  You have successfully accepted the updated terms and conditions. Redirecting to dashboard...
                </p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no re-acceptance needed, show message instead of auto-redirecting
  if (!onboardingLoading && !termsLoading && !needsReAcceptance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Terms Up to Date</h2>
                <p className="text-muted-foreground mb-4">
                  You have already accepted the latest terms and conditions.
                </p>
                <Button asChild>
                  <Link href="/member">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/member" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Alert */}
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Terms and Conditions Updated</strong><br />
            Our terms and conditions have been updated. You must accept the new version to continue using your account.
          </AlertDescription>
        </Alert>

        {/* Terms Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>Updated Terms and Conditions</CardTitle>
            </div>
            <CardDescription>
              Version {termsData?.version} - Effective {termsData?.effective_date ? formatDate(termsData.effective_date) : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/50 prose prose-sm max-w-none"
              onScroll={handleScroll}
            >
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: termsData?.content?.replace(/\n/g, '<br>') || 'No content available' 
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please scroll to the bottom to enable the acceptance checkbox.
            </p>
          </CardContent>
        </Card>

        {/* Acceptance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accept Updated Terms</CardTitle>
            <CardDescription>
              By accepting, you agree to the updated terms and conditions above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms-acceptance"
                checked={termsAccepted}
                onCheckedChange={handleTermsChange}
                disabled={!hasScrolledToBottom}
                className="mt-1"
              />
              <div className="space-y-1">
                <label
                  htmlFor="terms-acceptance"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and accept the updated Terms and Conditions
                </label>
                <p className="text-xs text-muted-foreground">
                  {!hasScrolledToBottom 
                    ? "Please scroll through the terms above to enable this option."
                    : "You can now accept the terms and conditions."
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleReAccept}
                disabled={!termsAccepted || reAcceptTermsMutation.isPending}
                className="flex-1"
              >
                {reAcceptTermsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Updated Terms
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              By accepting, you acknowledge that you have read, understood, and agree to be bound by the updated terms and conditions.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
