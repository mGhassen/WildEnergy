"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, LogOut, Sun, Moon, ArrowLeft, ArrowRight, 
  Heart, Users, MapPin, Smartphone, Globe, Megaphone, 
  Star, Coffee, Sparkles, Zap, Target, Trophy
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useMemberOnboarding, useUpdateMemberOnboarding } from "@/hooks/useMemberOnboarding";
import { FormSkeleton } from "@/components/skeletons";

interface DiscoveryForm {
  discoverySource: string;
  customSource: string;
}

const DISCOVERY_OPTIONS = [
  { 
    value: "social_media", 
    label: "Réseaux sociaux", 
    description: "Facebook, Instagram, TikTok...",
    icon: Smartphone
  },
  { 
    value: "friend_family", 
    label: "Ami/Famille", 
    description: "Recommandation d'un proche",
    icon: Heart
  },
  { 
    value: "advertisement", 
    label: "Publicité", 
    description: "En ligne, radio, TV...",
    icon: Megaphone
  },
  { 
    value: "google_search", 
    label: "Recherche Google", 
    description: "Vous cherchiez un studio de pole dance",
    icon: Search
  },
  { 
    value: "walk_by", 
    label: "Passage devant", 
    description: "Le studio vous a interpellé",
    icon: MapPin
  },
  { 
    value: "referral", 
    label: "Parrainage", 
    description: "Un membre vous a parrainé",
    icon: Users
  },
  { 
    value: "event", 
    label: "Événement", 
    description: "Atelier, démonstration...",
    icon: Star
  },
  { 
    value: "website", 
    label: "Site web", 
    description: "Notre site vous a convaincu",
    icon: Globe
  }
];

export default function DiscoveryOnboarding() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // Get member ID from user
  const memberId = user?.member_id;
  
  // Fetch onboarding data
  const { data: onboarding } = useMemberOnboarding(memberId || '');
  const updateOnboardingMutation = useUpdateMemberOnboarding();
  
  const [formData, setFormData] = useState<DiscoveryForm>({
    discoverySource: "",
    customSource: "",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleInputChange = (field: keyof DiscoveryForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
    handleInputChange("discoverySource", value);
  };

  const validateForm = (): boolean => {
    if (!formData.discoverySource) {
      toast({
        title: "Oops !",
        description: "Choisissez comment vous nous avez trouvés pour continuer",
        variant: "destructive",
      });
      return false;
    }
    
    if (formData.discoverySource === "other" && !formData.customSource.trim()) {
      toast({
        title: "Presque !",
        description: "Dites-nous comment vous nous avez découverts",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberId) {
      toast({
        title: "Erreur",
        description: "Membre non trouvé",
        variant: "destructive",
      });
      return;
    }

    // Discovery source is optional - use selected option or undefined
    const discoverySource = selectedOption ? (formData.discoverySource === "other" 
      ? formData.customSource 
      : formData.discoverySource) : undefined;

    // Update onboarding with discovery source
    updateOnboardingMutation.mutate({ 
      memberId, 
      data: { discovery_source: discoverySource } 
    }, {
      onSuccess: () => {
        router.push("/member/onboarding/terms");
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading while user data is being fetched
  if (isLoading) {
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

  // If no user after loading, show error
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Erreur: Impossible de charger vos informations</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        
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
      
      <Card className="w-full max-w-4xl bg-card/95 backdrop-blur-sm border-border shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground mb-4">
            Racontez-nous votre histoire ! ✨
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Comment avez-vous découvert Wild Energy ? Chaque histoire nous aide à mieux vous connaître !
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Creative Option Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DISCOVERY_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                const isSelected = selectedOption === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(option.value)}
                    className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      isSelected 
                        ? 'bg-primary/10 border-primary shadow-lg scale-105' 
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-center space-y-3">
                      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isSelected 
                          ? 'bg-primary shadow-lg' 
                          : 'bg-muted group-hover:bg-primary/20'
                      }`}>
                        <IconComponent className={`w-6 h-6 transition-colors duration-300 ${
                          isSelected ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm transition-colors duration-300 ${
                          isSelected ? 'text-foreground' : 'text-foreground/80'
                        }`}>
                          {option.label}
                        </h3>
                        <p className={`text-xs mt-1 transition-colors duration-300 ${
                          isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70'
                        }`}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <Zap className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Custom Input for "Other" */}
            {formData.discoverySource === "other" && (
              <div className="space-y-4 p-6 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Dites-nous tout ! 🎯
                  </h3>
                </div>
                <textarea
                  value={formData.customSource}
                  onChange={(e) => handleInputChange("customSource", e.target.value)}
                  placeholder="Racontez-nous votre histoire... Comment avez-vous découvert Wild Energy ?"
                  rows={4}
                  className="w-full p-4 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  required
                />
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={updateOnboardingMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {selectedOption ? "Parfait ! 🎉" : "Comment nous avez-vous trouvés ?"}
                </div>
                <Button 
                  type="submit" 
                  disabled={updateOnboardingMutation.isPending} 
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateOnboardingMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Continuer l'aventure
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
