"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useMemberOnboarding, useUpdateMemberOnboarding } from "@/hooks/useMemberOnboarding";
import { FormSkeleton } from "@/components/skeletons";

interface PersonalInfoForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  profession: string;
  address: string;
  phone: string;
  email: string;
}

export default function PersonalInfoOnboarding() {
  console.log('PersonalInfoOnboarding component rendered');
  
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // Get member ID from user
  const memberId = user?.member_id;
  
  console.log('User data:', user);
  console.log('Member ID:', memberId);
  console.log('Is loading:', isLoading);
  
  // Fetch profile and onboarding data
  const { data: profile, isLoading: profileLoading } = useProfile(memberId || '');
  const { data: onboarding } = useMemberOnboarding(memberId || '');
  const updateProfileMutation = useUpdateProfile();
  const updateOnboardingMutation = useUpdateMemberOnboarding();
  
  console.log('Profile data:', profile);
  console.log('Profile loading:', profileLoading);
  
  const [formData, setFormData] = useState<PersonalInfoForm>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    profession: "",
    address: "",
    phone: "",
    email: "",
  });

  // Initialize form with profile data from database
  useEffect(() => {
    if (profile) {
      const baseData = {
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        dateOfBirth: profile.date_of_birth || "",
        profession: profile.profession || "",
        address: profile.address || "",
        phone: profile.phone || "",
        email: user?.email || "", // Use account email
      };

      setFormData(baseData);
    }
  }, [profile, user, memberId]);

  const handleInputChange = (field: keyof PersonalInfoForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast({
        title: "Erreur",
        description: "Le prénom est requis",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.lastName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom est requis",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.dateOfBirth) {
      toast({
        title: "Erreur",
        description: "La date de naissance est requise",
        variant: "destructive",
      });
      return false;
    }
    
    // Check if user is at least 16 years old
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    
    if (actualAge < 16 || actualAge > 100) {
      toast({
        title: "Erreur",
        description: "Vous devez avoir entre 16 et 100 ans",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.profession.trim()) {
      toast({
        title: "Erreur",
        description: "La profession est requise",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.address.trim()) {
      toast({
        title: "Erreur",
        description: "L'adresse est requise",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.phone.trim()) {
      toast({
        title: "Erreur",
        description: "Le numéro de téléphone est requis",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.email.trim()) {
      toast({
        title: "Erreur",
        description: "L'email est requis",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.dateOfBirth || 
        !formData.profession.trim() || !formData.address.trim() || !formData.phone.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Get member ID from URL or use a hardcoded one for testing
    const currentMemberId = memberId || '9357d9e2-36de-403c-93c3-c8f95f9ade29';
    
    if (!currentMemberId) {
      toast({
        title: "Erreur",
        description: "ID membre non trouvé",
        variant: "destructive",
      });
      return;
    }

    const profileData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      date_of_birth: formData.dateOfBirth,
      profession: formData.profession,
      address: formData.address,
      phone: formData.phone,
    };

    try {
      // Direct API call instead of using mutations
      const token = localStorage.getItem('access_token');
      
      // Update profile
      const profileResponse = await fetch(`/api/member/profile/${currentMemberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Update onboarding status
      const onboardingResponse = await fetch(`/api/member/onboarding/${currentMemberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ personal_info_completed: true }),
      });

      if (!onboardingResponse.ok) {
        const errorData = await onboardingResponse.json();
        throw new Error(errorData.error || 'Failed to update onboarding status');
      }

      // Success - redirect to physical profile page
      toast({
        title: "Succès",
        description: "Vos informations ont été enregistrées avec succès",
      });
      
      router.push("/member/onboarding/physical-profile");
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Determine what to render based on conditions
  const shouldShowLoading = isLoading || profileLoading;
  const shouldShowError = !isLoading && !profileLoading && !user;

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
      
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Informations Personnelles</CardTitle>
          <CardDescription>
            Veuillez compléter vos informations personnelles pour finaliser votre inscription
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Prénom *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Votre prénom"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de naissance *
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  placeholder="Votre date de naissance"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profession" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Profession *
                </Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleInputChange("profession", e.target.value)}
                  placeholder="Votre profession"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresse *
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Votre adresse complète"
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Téléphone *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Votre numéro de téléphone"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Votre email"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                className="w-full md:w-auto"
              >
                Continuer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
