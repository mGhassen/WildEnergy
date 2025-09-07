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
import { User, Mail, Phone, MapPin, Briefcase, Calendar, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<PersonalInfoForm>({
    firstName: "",
    lastName: "",
    age: 0,
    profession: "",
    address: "",
    phone: "",
    email: "",
  });

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('onboarding-personal-info');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    } else if (user) {
      // If no saved data, prefill with user data
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        age: user.age || 0,
        profession: user.profession || "",
        address: user.address || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('onboarding-personal-info', JSON.stringify(formData));
  }, [formData]);

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
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/member/onboarding/personal-info", formData);
      
      if (response.success) {
        // Clear saved form data from localStorage
        localStorage.removeItem('onboarding-personal-info');
        
        toast({
          title: "Succès",
          description: "Informations personnelles sauvegardées",
        });
        router.push("/member/onboarding/terms");
      } else {
        throw new Error(response.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving personal info:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      {/* Logout Button */}
      <div className="absolute top-4 right-4">
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
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? "Enregistrement..." : "Continuer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
