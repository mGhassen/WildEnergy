"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TermsOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  useEffect(() => {
    // Load terms content from markdown file
    const loadTerms = async () => {
      try {
        const response = await fetch("/general-conditions.md");
        if (response.ok) {
          const content = await response.text();
          setTermsContent(content);
        } else {
          throw new Error("Impossible de charger les conditions générales");
        }
      } catch (error) {
        console.error("Error loading terms:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les conditions générales",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTerms(false);
      }
    };

    loadTerms();
  }, [toast]);

  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      toast({
        title: "Attention",
        description: "Vous devez accepter les conditions générales pour continuer",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/member/onboarding/accept-terms", { termsAccepted: true });

      if (response.success) {
        toast({
          title: "Félicitations !",
          description: "Votre inscription est maintenant complète. Bienvenue chez Wild Energy !",
        });
        router.push("/member");
      } else {
        throw new Error(response.error || "Erreur lors de l'acceptation des conditions");
      }
    } catch (error) {
      console.error("Error accepting terms:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMarkdown = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-primary">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2 mt-4">$1</h3>')
      .replace(/^\*\*(.*)\*\*$/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<[h|l])/gm, '<p class="mb-4">')
      .replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside mb-4">$1</ul>');
  };

  if (isLoadingTerms) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des conditions générales...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Conditions Générales d'Utilisation</CardTitle>
          <CardDescription>
            Veuillez lire et accepter nos conditions générales pour finaliser votre inscription
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Terms Content */}
          <div className="max-h-96 overflow-y-auto border rounded-lg p-6 bg-muted/30">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(termsContent) 
              }}
            />
          </div>
          
          {/* Acceptance Checkbox */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/20">
            <Checkbox
              id="terms-acceptance"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              className="mt-1"
            />
            <div className="space-y-2">
              <Label 
                htmlFor="terms-acceptance" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                J'ai lu et j'accepte les conditions générales d'utilisation de Wild Energy
              </Label>
              <p className="text-xs text-muted-foreground">
                En cochant cette case, vous confirmez avoir lu, compris et accepté l'intégralité 
                des conditions générales d'utilisation ci-dessus.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Retour
            </Button>
            <Button
              onClick={handleAcceptTerms}
              disabled={!termsAccepted || isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                "Finalisation..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accepter et Finaliser
                </>
              )}
            </Button>
          </div>
          
          {/* Warning Message */}
          {!termsAccepted && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Vous devez accepter les conditions générales pour accéder à la plateforme.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
