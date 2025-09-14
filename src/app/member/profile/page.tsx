"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUpdateProfile, UpdateProfileData } from "@/hooks/useProfile";
import { useOnboardingStatus, useUpdateMemberOnboarding } from "@/hooks/useMemberOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Shield,
  Activity,
  Ruler,
  Weight,
  TrendingUp,
  Save,
  Edit3,
  X,
  LogOut,
  ArrowLeft,
  CheckCircle,
  Loader2,
  FileText,
  ScrollText,
  ExternalLink,
  Mail
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { FormSkeleton } from "@/components/skeletons";
import Link from "next/link";

export default function MemberProfile() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPhysical, setIsEditingPhysical] = useState(false);
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    first_name: "",
    last_name: "",
    phone: "",
    profile_email: "",
    date_of_birth: "",
    address: "",
    profession: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    profile_image_url: "",
  });

  const [physicalProfileData, setPhysicalProfileData] = useState({
    gender: "",
    weight: "",
    height: "",
    activity_level: "",
    goal: "",
  });

  // Hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(user?.member_id || '');
  const updateProfileMutation = useUpdateProfile();
  const { data: onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus();
  const updateOnboardingMutation = useUpdateMemberOnboarding();

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        profile_email: profile.profile_email || "",
        date_of_birth: profile.date_of_birth || "",
        address: profile.address || "",
        profession: profile.profession || "",
        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_phone: profile.emergency_contact_phone || "",
        profile_image_url: profile.profile_image_url || "",
      });
    }
  }, [profile]);

  // Initialize physical profile data when onboarding status loads
  useEffect(() => {
    if (onboardingStatus?.data?.physicalProfile) {
      setPhysicalProfileData({
        gender: onboardingStatus.data.physicalProfile.gender || "",
        weight: onboardingStatus.data.physicalProfile.weight?.toString() || "",
        height: onboardingStatus.data.physicalProfile.height?.toString() || "",
        activity_level: onboardingStatus.data.physicalProfile.activity_level || "",
        goal: onboardingStatus.data.physicalProfile.goal || "",
      });
    }
  }, [onboardingStatus]);

  // Helper functions
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({ 
        memberId: user?.member_id || '', 
        data: profileData 
      });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        profile_email: profile.profile_email || "",
        date_of_birth: profile.date_of_birth || "",
        address: profile.address || "",
        profession: profile.profession || "",
        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_phone: profile.emergency_contact_phone || "",
        profile_image_url: profile.profile_image_url || "",
      });
    }
    setIsEditing(false);
  };

  const handleSavePhysical = async () => {
    try {
      const physicalProfile = {
        gender: physicalProfileData.gender,
        weight: physicalProfileData.weight ? parseFloat(physicalProfileData.weight) : null,
        height: physicalProfileData.height ? parseFloat(physicalProfileData.height) : null,
        activity_level: physicalProfileData.activity_level,
        goal: physicalProfileData.goal,
      };

      await updateOnboardingMutation.mutateAsync({
        memberId: user?.member_id || '',
        data: {
          physical_profile: physicalProfile,
          physical_profile_completed: true,
        } as any
      });
      
      setIsEditingPhysical(false);
      toast({
        title: "Physical profile updated",
        description: "Your physical profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update physical profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelPhysical = () => {
    if (onboardingStatus?.data?.physicalProfile) {
      setPhysicalProfileData({
        gender: onboardingStatus.data.physicalProfile.gender || "",
        weight: onboardingStatus.data.physicalProfile.weight?.toString() || "",
        height: onboardingStatus.data.physicalProfile.height?.toString() || "",
        activity_level: onboardingStatus.data.physicalProfile.activity_level || "",
        goal: onboardingStatus.data.physicalProfile.goal || "",
      });
    }
    setIsEditingPhysical(false);
  };

  const formatDisplayDate = (dateString: string) => {
    return formatDate(dateString);
  };

  const formatDisplayPhone = (phone: string) => {
    if (!phone) return 'Not provided';
    return phone;
  };

  // Loading state
  if (profileLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground">Please log in to view your profile.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-destructive">Error loading profile. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/member" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>

        {/* Profile Overview Card - Redesigned */}
        <Card className="border-0 shadow-lg mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.profile_image_url || ""} />
                  <AvatarFallback className="text-xl sm:text-2xl font-bold bg-primary text-primary-foreground">
                    {getInitials(profile?.first_name, profile?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                  {profileData.first_name} {profileData.last_name}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-3 break-all">{user?.email}</p>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active Member
                  </Badge>
                  {profile?.profession && (
                    <Badge variant="outline" className="text-xs">
                      {profile.profession}
                    </Badge>
                  )}
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Member since {profile?.created_at ? formatDisplayDate(profile.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Profile - Dashboard Style */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">Physical Profile</h2>
            </div>
            <Button
              onClick={() => setIsEditingPhysical(!isEditingPhysical)}
              size="sm"
              variant="outline"
              className="p-2"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>

            {isEditingPhysical ? (
              // Edit Mode - Show Form
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Edit Physical Profile</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSavePhysical}
                        disabled={updateOnboardingMutation.isPending}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {updateOnboardingMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelPhysical}
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={physicalProfileData.gender}
                        onChange={(e) => setPhysicalProfileData({ ...physicalProfileData, gender: e.target.value })}
                        className="w-full p-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={physicalProfileData.weight}
                        onChange={(e) => setPhysicalProfileData({ ...physicalProfileData, weight: e.target.value })}
                        placeholder="Enter your weight"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={physicalProfileData.height}
                        onChange={(e) => setPhysicalProfileData({ ...physicalProfileData, height: e.target.value })}
                        placeholder="Enter your height"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="activity_level">Activity Level</Label>
                      <select
                        id="activity_level"
                        value={physicalProfileData.activity_level}
                        onChange={(e) => setPhysicalProfileData({ ...physicalProfileData, activity_level: e.target.value })}
                        className="w-full p-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select activity level</option>
                        <option value="sedentary">Sedentary</option>
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="active">Active</option>
                        <option value="very_active">Very Active</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="goal">Pole Dancing Goal</Label>
                      <Textarea
                        id="goal"
                        value={physicalProfileData.goal}
                        onChange={(e) => setPhysicalProfileData({ ...physicalProfileData, goal: e.target.value })}
                        placeholder="What are your pole dancing goals?"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Display Mode - Show Dashboard Boxes or Empty State
              <>
                {onboardingStatus?.data?.physicalProfile ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs opacity-90 mb-1">Weight</p>
                        <p className="text-sm sm:text-lg font-bold truncate">
                          {onboardingStatus.data.physicalProfile.weight ? `${onboardingStatus.data.physicalProfile.weight} kg` : '—'}
                        </p>
                      </div>
                      <Weight className="w-4 h-4 sm:w-6 sm:h-6 opacity-80 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs opacity-90 mb-1">Height</p>
                        <p className="text-sm sm:text-lg font-bold truncate">
                          {onboardingStatus.data.physicalProfile.height ? `${onboardingStatus.data.physicalProfile.height} cm` : '—'}
                        </p>
                      </div>
                      <Ruler className="w-4 h-4 sm:w-6 sm:h-6 opacity-80 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 sm:p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs opacity-90 mb-1">Activity</p>
                        <p className="text-xs sm:text-sm font-bold capitalize truncate">
                          {onboardingStatus.data.physicalProfile.activity_level ? 
                            onboardingStatus.data.physicalProfile.activity_level.replace('_', ' ') : 
                            '—'
                          }
                        </p>
                      </div>
                      <Activity className="w-4 h-4 sm:w-6 sm:h-6 opacity-80 flex-shrink-0" />
                    </div>
                  </div>

                  {/* BMI (if available) */}
                  {onboardingStatus.data.physicalProfile.weight && onboardingStatus.data.physicalProfile.height && (
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 sm:p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs opacity-90 mb-1">BMI</p>
                          <p className="text-sm sm:text-lg font-bold">
                            {((onboardingStatus.data.physicalProfile.weight / Math.pow(onboardingStatus.data.physicalProfile.height / 100, 2))).toFixed(1)}
                          </p>
                          <p className="text-xs opacity-80">kg/m²</p>
                        </div>
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 opacity-80 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Empty State - Show placeholder boxes with add button
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border-2 border-dashed border-muted-foreground/30">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Weight</p>
                          <p className="text-sm sm:text-lg font-bold text-muted-foreground">—</p>
                        </div>
                        <Weight className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border-2 border-dashed border-muted-foreground/30">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Height</p>
                          <p className="text-sm sm:text-lg font-bold text-muted-foreground">—</p>
                        </div>
                        <Ruler className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border-2 border-dashed border-muted-foreground/30">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Activity</p>
                          <p className="text-xs sm:text-sm font-bold text-muted-foreground">—</p>
                        </div>
                        <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border-2 border-dashed border-muted-foreground/30">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">BMI</p>
                          <p className="text-sm sm:text-lg font-bold text-muted-foreground">—</p>
                          <p className="text-xs text-muted-foreground/70">kg/m²</p>
                        </div>
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">No physical profile data available</p>
                    <Button
                      onClick={() => setIsEditingPhysical(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Add Physical Profile
                    </Button>
                  </div>
                </div>
                )}
              </>
            )}
        </div>

        {/* Personal Information */}
        <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-sm">Your basic profile details</CardDescription>
                </div>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  size="sm"
                  variant="outline"
                  className="p-2"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {isEditing ? (
                // Edit Mode - Show Form Inputs
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.first_name || ""}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        placeholder="Enter your first name"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.last_name || ""}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        placeholder="Enter your last name"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Account Email</Label>
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted cursor-not-allowed text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Account email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile_email" className="text-sm">Contact Email</Label>
                      <Input
                        id="profile_email"
                        type="email"
                        value={profileData.profile_email || ""}
                        onChange={(e) => setProfileData({ ...profileData, profile_email: e.target.value })}
                        placeholder="Enter your contact email"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">This is your contact email (separate from account email)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">Phone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone || ""}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="Enter your phone number"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="text-sm">Birth Date</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={profileData.date_of_birth || ""}
                        onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profession" className="text-sm">Profession</Label>
                    <Input
                      id="profession"
                      value={profileData.profession || ""}
                      onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                      placeholder="Enter your profession"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm">Address</Label>
                    <Textarea
                      id="address"
                      value={profileData.address || ""}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Enter your address"
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base sm:text-lg font-semibold text-foreground">Emergency Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_name" className="text-sm">Emergency Contact Name</Label>
                        <Input
                          id="emergency_contact_name"
                          value={profileData.emergency_contact_name || ""}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_name: e.target.value })}
                          placeholder="Enter emergency contact name"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_phone" className="text-sm">Emergency Contact Phone</Label>
                        <Input
                          id="emergency_contact_phone"
                          value={profileData.emergency_contact_phone || ""}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_phone: e.target.value })}
                          placeholder="Enter emergency contact phone"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button onClick={handleSave} disabled={updateProfileMutation.isPending} className="w-full sm:w-auto">
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                // Display Mode - Show Profile Data
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">First Name</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.first_name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Name</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.last_name || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Account Email</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium break-all">{user?.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Contact Email</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium break-all">{profile?.profile_email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Phone</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Birth Date</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.date_of_birth ? formatDisplayDate(profile.date_of_birth) : 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Profession</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">{profile?.profession || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Address</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border min-h-[60px]">
                      <p className="text-sm font-medium">{profile?.address || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base sm:text-lg font-semibold text-foreground">Emergency Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2 sm:space-y-3">
                        <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Emergency Contact Name</Label>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-sm font-medium">{profile?.emergency_contact_name || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Emergency Contact Phone</Label>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-sm font-medium">{profile?.emergency_contact_phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        {/* Account Information */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription className="text-sm">Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Account Status</Label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Active</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Authentication</Label>
                <div className="flex items-center gap-2">
                  {user?.provider === 'google' ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Google</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium">Email</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Member Since</Label>
                <p className="text-sm font-medium">
                  {profile?.created_at ? formatDisplayDate(profile.created_at) : 'N/A'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="text-sm font-medium">
                  {profile?.updated_at ? formatDisplayDate(profile.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Documents */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Legal Documents
            </CardTitle>
            <CardDescription className="text-sm">Access your terms, conditions, and gym regulations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Terms & Conditions */}
              <Link href="/member/terms" className="group">
                <div className="p-4 sm:p-6 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group-hover:shadow-md">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                        Terms & Conditions
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        View your signed terms and conditions
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Interior Regulation */}
              <Link href="/member/interior-regulation" className="group">
                <div className="p-4 sm:p-6 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group-hover:shadow-md">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors flex-shrink-0">
                      <ScrollText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                        Interior Regulation
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Gym rules, policies, and guidelines
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}