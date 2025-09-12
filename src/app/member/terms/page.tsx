"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTerms } from "@/hooks/useTerms";
import { useMemberOnboarding } from "@/hooks/useMemberOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, Calendar, User, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/date";
import { FormSkeleton } from "@/components/skeletons";
import Link from "next/link";

export default function MemberTerms() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Get member ID from user
  const memberId = user?.member_id || '';
  
  // Fetch terms data and onboarding status
  const { data: termsData, isLoading: termsLoading, error: termsError } = useTerms();
  const { data: onboardingData, isLoading: onboardingLoading } = useMemberOnboarding(memberId);

  if (authLoading || termsLoading || onboardingLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
        </div>
        <FormSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Please log in to view terms and conditions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (termsError) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive">Error loading terms and conditions. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const termsAccepted = onboardingData?.terms_accepted || false;
  const termsAcceptedAt = onboardingData?.terms_accepted_at;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground">View the terms and conditions you have agreed to</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/member/profile" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Terms Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Terms Status
          </CardTitle>
          <CardDescription>Your current terms and conditions acceptance status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {termsAccepted ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold">
                  {termsAccepted ? "Terms Accepted" : "Terms Not Accepted"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {termsAccepted 
                    ? "You have accepted the terms and conditions" 
                    : "You have not yet accepted the terms and conditions"
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              {termsAccepted ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  Accepted
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Not Accepted
                </Badge>
              )}
            </div>
          </div>

          {termsAccepted && termsAcceptedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Accepted on {formatDate(termsAcceptedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Terms and Conditions
          </CardTitle>
          <CardDescription>The complete terms and conditions document</CardDescription>
        </CardHeader>
        <CardContent>
          {termsData?.content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: termsData.content }}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No terms and conditions available at the moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
          <CardDescription>Additional details about terms and conditions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Acceptance Required</h4>
                <p className="text-sm text-muted-foreground">
                  You must accept the terms and conditions to use our services and access the member portal.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Updates and Changes</h4>
                <p className="text-sm text-muted-foreground">
                  We may update these terms from time to time. You will be notified of any significant changes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Contact Information</h4>
                <p className="text-sm text-muted-foreground">
                  If you have any questions about these terms, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
