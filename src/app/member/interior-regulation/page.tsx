"use client";

import { useAuth } from "@/hooks/use-auth";
import { useInteriorRegulation } from "@/hooks/useInteriorRegulation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  FileText,
  Calendar,
  Loader2
} from "lucide-react";
import { FormSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatDate } from "@/lib/date";

export default function InteriorRegulation() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const { data: interiorRegulation, isLoading, error } = useInteriorRegulation();

  // Loading state
  if (isLoading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-destructive">Error loading interior regulation. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No interior regulation found
  if (!interiorRegulation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Interior Regulation Available</h2>
                <p className="text-muted-foreground mb-4">
                  There are currently no interior regulations published.
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

        {/* Interior Regulation Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>{interiorRegulation.title}</CardTitle>
            </div>
            <CardDescription>
              Version {interiorRegulation.version} - Effective {formatDate(interiorRegulation.effective_date)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: interiorRegulation.content?.replace(/\n/g, '<br>') || 'No content available' 
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Last updated: {formatDate(interiorRegulation.updated_at)}
                </div>
              </div>
              <div className="text-xs">
                Version {interiorRegulation.version}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
