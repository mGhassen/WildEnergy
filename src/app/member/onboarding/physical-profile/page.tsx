"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Sun, Moon, ArrowLeft, ArrowRight, 
  User, Weight, Ruler, Target, Activity, 
  Sparkles, Zap, Heart, Star, Trophy
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useMemberOnboarding, useUpdateMemberOnboarding } from "@/hooks/useMemberOnboarding";
import { FormSkeleton } from "@/components/skeletons";

interface PhysicalProfileForm {
  gender: string;
  weight: string;
  height: string;
  goal: string;
  activityLevel: string;
}

const GENDER_OPTIONS = [
  { value: "female", label: "Femme", icon: "👩" },
  { value: "male", label: "Homme", icon: "👨" },
  { value: "non_binary", label: "Non-binaire", icon: "🧑" },
  { value: "prefer_not_to_say", label: "Préfère ne pas dire", icon: "🤐" }
];

const GOAL_OPTIONS = [
  { 
    value: "fitness", 
    label: "Fitness & Musculation", 
    description: "Renforcer mon corps et améliorer ma condition physique",
    icon: "💪"
  },
  { 
    value: "flexibility", 
    label: "Flexibilité & Souplesse", 
    description: "Développer ma souplesse et ma mobilité",
    icon: "🤸"
  },
  { 
    value: "artistic", 
    label: "Expression Artistique", 
    description: "Exprimer ma créativité et ma sensibilité artistique",
    icon: "🎭"
  },
  { 
    value: "confidence", 
    label: "Confiance en Soi", 
    description: "Renforcer ma confiance et mon estime de moi",
    icon: "✨"
  },
  { 
    value: "fun", 
    label: "Plaisir & Détente", 
    description: "M'amuser et me détendre dans une activité ludique",
    icon: "😊"
  },
  { 
    value: "challenge", 
    label: "Défi Personnel", 
    description: "Me lancer un défi et sortir de ma zone de confort",
    icon: "🏆"
  },
  { 
    value: "social", 
    label: "Rencontres & Social", 
    description: "Rencontrer de nouvelles personnes et créer des liens",
    icon: "👥"
  },
  { 
    value: "dance", 
    label: "Danse & Chorégraphie", 
    description: "Apprendre la danse et créer des chorégraphies",
    icon: "💃"
  }
];

const ACTIVITY_LEVELS = [
  { 
    value: "sedentary", 
    label: "Sédentaire", 
    description: "Peu ou pas d'exercice",
    icon: "🛋️",
    color: "from-gray-400 to-gray-500",
    intensity: 1
  },
  { 
    value: "light", 
    label: "Légèrement actif", 
    description: "Exercice léger 1-3 fois/semaine",
    icon: "🚶‍♀️",
    color: "from-blue-400 to-blue-500",
    intensity: 2
  },
  { 
    value: "moderate", 
    label: "Modérément actif", 
    description: "Exercice modéré 3-5 fois/semaine",
    icon: "🏃‍♀️",
    color: "from-green-400 to-green-500",
    intensity: 3
  },
  { 
    value: "active", 
    label: "Très actif", 
    description: "Exercice intense 6-7 fois/semaine",
    icon: "💪",
    color: "from-orange-400 to-orange-500",
    intensity: 4
  },
  { 
    value: "very_active", 
    label: "Extrêmement actif", 
    description: "Exercice très intense, travail physique",
    icon: "🔥",
    color: "from-red-400 to-red-500",
    intensity: 5
  }
];

export default function PhysicalProfileOnboarding() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // Get member ID from user
  const memberId = user?.member_id;
  
  // Fetch onboarding data
  const { data: onboarding } = useMemberOnboarding(memberId || '');
  const updateOnboardingMutation = useUpdateMemberOnboarding();
  
  const [formData, setFormData] = useState<PhysicalProfileForm>({
    gender: "",
    weight: "",
    height: "",
    goal: "",
    activityLevel: "",
  });

  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedActivityLevel, setSelectedActivityLevel] = useState<string | null>(null);

  const handleInputChange = (field: keyof PhysicalProfileForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGoalSelect = (value: string) => {
    setSelectedGoal(value);
    handleInputChange("goal", value);
  };

  const handleActivityLevelSelect = (value: string) => {
    setSelectedActivityLevel(value);
    handleInputChange("activityLevel", value);
  };

  const validateForm = (): boolean => {
    if (!formData.gender) {
      toast({
        title: "Oops !",
        description: "Veuillez sélectionner votre genre",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.weight.trim()) {
      toast({
        title: "Presque !",
        description: "Veuillez indiquer votre poids",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.height.trim()) {
      toast({
        title: "Presque !",
        description: "Veuillez indiquer votre taille",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.goal) {
      toast({
        title: "Presque !",
        description: "Veuillez choisir votre objectif principal",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.activityLevel) {
      toast({
        title: "Presque !",
        description: "Veuillez indiquer votre niveau d'activité physique",
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

    // Update onboarding with physical profile data (optional)
    const physicalProfileData = formData.gender && formData.weight && formData.height && formData.goal && formData.activityLevel ? {
      gender: formData.gender,
      weight: parseFloat(formData.weight),
      height: parseInt(formData.height),
      goal: formData.goal,
      activity_level: formData.activityLevel
    } : null;

    updateOnboardingMutation.mutate({ 
      memberId, 
      data: { 
        physical_profile_completed: true,
        physical_profile: physicalProfileData
      } 
    }, {
      onSuccess: () => {
        router.push("/member/onboarding/discovery");
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

  // Determine what to render based on conditions
  const shouldShowLoading = isLoading;
  const shouldShowError = !isLoading && !user;

  // Show loading while user data is being fetched
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto"></div>
          </div>
          <FormSkeleton fields={8} showSubmit={true} />
        </div>
      </div>
    );
  }

  // If no user after loading, show error
  if (shouldShowError) {
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
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground mb-4">
            Votre profil physique 💪
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Aidez-nous à personnaliser votre expérience de pole dance selon vos objectifs et votre niveau
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Gender Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Genre
              </Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {GENDER_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label 
                      htmlFor={option.value} 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Weight and Height */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="weight" className="flex items-center gap-2">
                  <Weight className="w-4 h-4" />
                  Poids (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  placeholder="Ex: 65"
                  className="text-center text-lg"
                  min="30"
                  max="200"
                  step="0.1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Taille (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  placeholder="Ex: 170"
                  className="text-center text-lg"
                  min="120"
                  max="220"
                />
              </div>
            </div>

            {/* Goals Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Votre objectif principal avec la pole dance
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GOAL_OPTIONS.map((option) => {
                  const isSelected = selectedGoal === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleGoalSelect(option.value)}
                      className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl text-left ${
                        isSelected 
                          ? 'bg-primary/10 border-primary shadow-lg scale-105' 
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isSelected 
                            ? 'bg-primary shadow-lg' 
                            : 'bg-muted group-hover:bg-primary/20'
                        }`}>
                          <span className="text-lg">{option.icon}</span>
                        </div>
                        <div className="flex-1">
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
            </div>

            {/* Activity Level Slider */}
            <div className="space-y-6">
              <Label className="text-base font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Niveau d'activité physique actuel
              </Label>
              
              {/* Simple Slider */}
              <div className="space-y-4">
                {/* Slider Track with Dots */}
                <div className="relative w-80 mx-auto">
                  {/* Slider Track */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/20 to-primary/60 rounded-full transition-all duration-500"
                      style={{ 
                        width: selectedActivityLevel 
                          ? selectedActivityLevel === 'sedentary'
                            ? '0%'
                            : `${(ACTIVITY_LEVELS.findIndex(level => level.value === selectedActivityLevel) / (ACTIVITY_LEVELS.length - 1)) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  
                  {/* Activity Level Dots */}
                  <div className="relative -mt-1">
                    {ACTIVITY_LEVELS.map((level, index) => {
                      const isSelected = selectedActivityLevel === level.value;
                      const isActive = selectedActivityLevel && ACTIVITY_LEVELS.findIndex(l => l.value === selectedActivityLevel) >= index;
                      
                      return (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => handleActivityLevelSelect(level.value)}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-3 transition-all duration-300 hover:scale-110 ${
                            isSelected
                              ? 'bg-primary border-primary shadow-lg scale-110'
                              : isActive
                              ? 'bg-primary/60 border-primary/60 shadow-md'
                              : 'bg-background border-muted hover:border-primary/50'
                          }`}
                          style={{ left: `${(index / (ACTIVITY_LEVELS.length - 1)) * 100}%` }}
                        >
                          <div className="flex items-center justify-center w-full h-full text-2xl">
                            {level.icon}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Activity Level Box - Only shown when selected */}
                {selectedActivityLevel && (
                  <div className="relative w-80 mx-auto">
                    <div 
                      className="absolute top-3 w-48 p-3 bg-card border border-border rounded-lg shadow-lg z-10"
                      style={{
                        left: `${(ACTIVITY_LEVELS.findIndex(level => level.value === selectedActivityLevel) / (ACTIVITY_LEVELS.length - 1)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className="text-center">
                        <div className="text-sm font-medium text-foreground mb-1">
                          {ACTIVITY_LEVELS.find(level => level.value === selectedActivityLevel)?.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ACTIVITY_LEVELS.find(level => level.value === selectedActivityLevel)?.description}
                        </div>
                      </div>
                      {/* Arrow pointing up to the circle */}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-card border-l border-t border-border rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-24">
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
                  {formData.gender && formData.weight && formData.height && formData.goal && formData.activityLevel ? "Parfait ! 🎉" : "Complétez votre profil"}
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
                      Continuer
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
