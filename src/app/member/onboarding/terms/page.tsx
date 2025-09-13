"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTerms } from "@/hooks/useTerms";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, AlertCircle, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useMemberOnboarding, useAcceptTerms } from "@/hooks/useMemberOnboarding";
import { FormSkeleton } from "@/components/skeletons";

export default function TermsOnboarding() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // Get member ID from user
  const memberId = user?.member_id;
  
  // Fetch onboarding data
  const { data: onboarding, isLoading: onboardingLoading } = useMemberOnboarding(memberId || '');
  const { data: termsData, isLoading: termsLoading, error: termsError } = useTerms();
  const acceptTermsMutation = useAcceptTerms();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load terms acceptance state from localStorage on component mount
  useEffect(() => {
    const savedTermsAccepted = localStorage.getItem('onboarding-terms-accepted');
    if (savedTermsAccepted === 'true') {
      setTermsAccepted(true);
    }
    // Note: We don't prefill terms acceptance from database as it should be user's choice
  }, []);

  useEffect(() => {
    // Load terms content from hook
    if (termsData) {
      setTermsContent(termsData.content);
    }
    if (termsError) {
      console.error("Error loading terms:", termsError);
      toast({
        title: "Erreur",
        description: "Impossible de charger les conditions générales",
        variant: "destructive",
      });
    }
  }, [termsData, termsError, toast]);

  // Check if content fits without scrolling when terms content changes
  useEffect(() => {
    if (termsContent && scrollContainerRef.current) {
      // Multiple attempts to check content fit
      const checkMultipleTimes = () => {
        checkIfContentFits(scrollContainerRef.current);
        // Check again after a longer delay
        setTimeout(() => {
          checkIfContentFits(scrollContainerRef.current);
        }, 500);
        // And once more after content is definitely rendered
        setTimeout(() => {
          checkIfContentFits(scrollContainerRef.current);
        }, 1000);
      };
      
      // Immediate check
      checkIfContentFits(scrollContainerRef.current);
      // Delayed checks
      setTimeout(checkMultipleTimes, 100);
    }
  }, [termsContent]);

  // Also check on window resize
  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        checkIfContentFits(scrollContainerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fallback: enable checkbox after 2 seconds if still not enabled
  useEffect(() => {
    if (termsContent && !hasScrolledToBottom) {
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback: enabling checkbox after timeout');
        setHasScrolledToBottom(true);
      }, 2000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [termsContent, hasScrolledToBottom]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleTermsChange = (checked: boolean) => {
    if (!hasScrolledToBottom) {
      toast({
        title: "Attention",
        description: "Veuillez lire entièrement les conditions générales avant de les accepter",
        variant: "destructive",
      });
      return;
    }
    
    setTermsAccepted(checked);
    // Save terms acceptance state to localStorage
    if (checked) {
      localStorage.setItem('onboarding-terms-accepted', 'true');
    } else {
      localStorage.removeItem('onboarding-terms-accepted');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10; // 10px tolerance
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      toast({
        title: "Merci !",
        description: "Vous pouvez maintenant accepter les conditions générales",
        variant: "default",
      });
    }
  };

  // Check if content fits without scrolling (no scrollbar needed)
  const checkIfContentFits = (element: HTMLDivElement | null) => {
    if (!element) return;
    
    // Check if the scrollable container needs scrolling
    const needsScrolling = element.scrollHeight > element.clientHeight;
    console.log('Content check:', { 
      scrollHeight: element.scrollHeight, 
      clientHeight: element.clientHeight, 
      needsScrolling, 
      hasScrolledToBottom 
    });
    
    if (!needsScrolling && !hasScrolledToBottom) {
      console.log('Content fits without scrolling - enabling checkbox');
      setHasScrolledToBottom(true);
    }
  };

  // Show loading while user data is being fetched
  if (isLoading || !user || onboardingLoading || termsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto"></div>
          </div>
          <FormSkeleton fields={6} showSubmit={true} />
        </div>
      </div>
    );
  }

  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      toast({
        title: "Attention",
        description: "Vous devez accepter les conditions générales pour continuer",
        variant: "destructive",
      });
      return;
    }

    if (!memberId) {
      toast({
        title: "Erreur",
        description: "Membre non trouvé",
        variant: "destructive",
      });
      return;
    }

    acceptTermsMutation.mutate({ memberId }, {
      onSuccess: () => {
        // Clear all onboarding data from localStorage
        localStorage.removeItem('onboarding-personal-info');
        localStorage.removeItem('onboarding-terms-accepted');
        
        toast({
          title: "Félicitations !",
          description: "Votre inscription est maintenant complète. Bienvenue chez Wild Energy !",
        });
        
        // Add a small delay to ensure cache is updated before redirect
        setTimeout(() => {
          router.push("/member");
        }, 500);
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error.message || "Une erreur est survenue",
          variant: "destructive",
        });
      }
    });
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        
        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </Button>
      </div>
      
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
          <div 
            ref={scrollContainerRef}
            className="max-h-[28rem] overflow-y-auto border rounded-lg p-6 bg-muted/30 terms-scroll"
            onScroll={handleScroll}
          >
            <div 
              className="text-sm text-foreground [&_h1]:text-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:first:mt-0
                         [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5
                         [&_h3]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4
                         [&_p]:text-foreground [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-sm
                         [&_ul]:text-foreground [&_ul]:mb-3 [&_ul]:pl-6 [&_ul]:space-y-1
                         [&_ol]:text-foreground [&_ol]:mb-3 [&_ol]:pl-6 [&_ol]:space-y-1
                         [&_li]:text-foreground [&_li]:leading-relaxed [&_li]:text-sm
                         [&_strong]:text-foreground [&_strong]:font-semibold
                         [&_em]:text-foreground [&_em]:italic
                         [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80"
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(termsContent) 
              }}
            />
          </div>
          
          {/* Acceptance Checkbox */}
          <div className={`flex items-start space-x-3 p-4 border rounded-lg ${hasScrolledToBottom ? 'bg-muted/20' : 'bg-muted/10'}`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Checkbox
                      id="terms-acceptance"
                      checked={termsAccepted}
                      onCheckedChange={handleTermsChange}
                      disabled={!hasScrolledToBottom}
                      className="mt-1"
                    />
                  </div>
                </TooltipTrigger>
                {!hasScrolledToBottom && (
                  <TooltipContent>
                    <p>Veuillez d'abord faire défiler et lire entièrement les conditions générales</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <div className="space-y-2">
              <Label 
                htmlFor="terms-acceptance" 
                className={`text-sm font-medium leading-none cursor-pointer ${!hasScrolledToBottom ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                J'ai lu et j'accepte les conditions générales d'utilisation de Wild Energy
              </Label>
              <p className="text-xs text-muted-foreground">
                {hasScrolledToBottom 
                  ? "En cochant cette case, vous confirmez avoir lu, compris et accepté l'intégralité des conditions générales d'utilisation ci-dessus."
                  : "Veuillez d'abord lire entièrement les conditions générales ci-dessus pour pouvoir les accepter."
                }
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={acceptTermsMutation.isPending}
            >
              Retour
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={handleAcceptTerms}
                      disabled={!termsAccepted || !hasScrolledToBottom || acceptTermsMutation.isPending}
                      className="min-w-[200px]"
                    >
                      {acceptTermsMutation.isPending ? (
                        "Finalisation..."
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accepter et Finaliser
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {(!termsAccepted || !hasScrolledToBottom) && !acceptTermsMutation.isPending && (
                  <TooltipContent>
                    <p>
                      {!hasScrolledToBottom 
                        ? "Veuillez d'abord lire entièrement les conditions générales"
                        : "Veuillez accepter les conditions générales"
                      }
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
