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
import { useUpdateUser } from "@/hooks/useUsers";

interface PersonalInfoForm {
  firstName: string;
  lastName: string;
  age: number;
  profession: string;
  address: string;
  phone: string;
  email: string;
}

export default function PersonalInfoOnboarding() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const updateUserMutation = useUpdateUser();
  
  const [formData, setFormData] = useState<PersonalInfoForm>({
    firstName: "",
    lastName: "",
    age: 0,
    profession: "",
    address: "",
    phone: "",
    email: "",
  });

  // Initialize form with user data from database
  useEffect(() => {
    console.log('User data in personal info:', user);
    if (user) {
      const baseData = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        age: user.age || 0,
        profession: user.profession || "",
        address: user.address || "",
        phone: user.phone || "",
        email: user.email || "",
      };

      console.log('Setting form data with:', baseData);
      setFormData(baseData);
    }
  }, [user]);

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
    
    if (!formData.age || formData.age < 16 || formData.age > 100) {
      toast({
        title: "Erreur",
        description: "L'âge doit être entre 16 et 100 ans",
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
    
    if (!validateForm()) return;
    
    if (!user?.id) {
      toast({
        title: "Erreur",
        description: "Utilisateur non trouvé",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      age: formData.age,
      profession: formData.profession,
      address: formData.address,
      phone: formData.phone,
      email: formData.email
    };

    updateUserMutation.mutate({ userId: user.id, data: updateData }, {
      onSuccess: () => {
        toast({
          title: "Succès",
          description: "Informations personnelles sauvegardées",
        });
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de vos informations...</p>
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
                <Label htmlFor="age" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Âge *
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="16"
                  max="100"
                  value={formData.age || ""}
                  onChange={(e) => handleInputChange("age", parseInt(e.target.value) || 0)}
                  placeholder="Votre âge"
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
              <Button type="submit" disabled={updateUserMutation.isPending} className="w-full md:w-auto">
                {updateUserMutation.isPending ? "Enregistrement..." : "Continuer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
