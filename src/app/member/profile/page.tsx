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
  Loader2
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/member" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Profile Overview Card - Redesigned */}
        <Card className="border-0 shadow-lg mb-8 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.profile_image_url || ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {getInitials(profile?.first_name, profile?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  {profileData.first_name} {profileData.last_name}
                </h1>
                <p className="text-lg text-muted-foreground mb-3">{user?.email}</p>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active Member
                  </Badge>
                  {profile?.profession && (
                    <Badge variant="outline" className="text-xs">
                      {profile.profession}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Member since {profile?.created_at ? formatDisplayDate(profile.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Profile - Dashboard Style */}
        {onboardingStatus?.data?.physicalProfile && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Physical Profile</h2>
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
              // Display Mode - Show Dashboard Boxes
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90 mb-1">Weight</p>
                      <p className="text-lg font-bold">
                        {onboardingStatus.data.physicalProfile.weight ? `${onboardingStatus.data.physicalProfile.weight} kg` : '—'}
                      </p>
                    </div>
                    <Weight className="w-6 h-6 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90 mb-1">Height</p>
                      <p className="text-lg font-bold">
                        {onboardingStatus.data.physicalProfile.height ? `${onboardingStatus.data.physicalProfile.height} cm` : '—'}
                      </p>
                    </div>
                    <Ruler className="w-6 h-6 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90 mb-1">Activity</p>
                      <p className="text-sm font-bold capitalize">
                        {onboardingStatus.data.physicalProfile.activity_level ? 
                          onboardingStatus.data.physicalProfile.activity_level.replace('_', ' ') : 
                          '—'
                        }
                      </p>
                    </div>
                    <Activity className="w-6 h-6 opacity-80" />
                  </div>
                </div>

                {/* BMI (if available) */}
                {onboardingStatus.data.physicalProfile.weight && onboardingStatus.data.physicalProfile.height && (
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs opacity-90 mb-1">BMI</p>
                        <p className="text-lg font-bold">
                          {((onboardingStatus.data.physicalProfile.weight / Math.pow(onboardingStatus.data.physicalProfile.height / 100, 2))).toFixed(1)}
                        </p>
                        <p className="text-xs opacity-80">kg/m²</p>
                      </div>
                      <TrendingUp className="w-6 h-6 opacity-80" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Personal Information */}
        <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <User className="w-5 h-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your basic profile details</CardDescription>
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
            <CardContent className="space-y-6">
              {isEditing ? (
                // Edit Mode - Show Form Inputs
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.first_name || ""}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.last_name || ""}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Account Email</Label>
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Account email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile_email">Contact Email</Label>
                      <Input
                        id="profile_email"
                        type="email"
                        value={profileData.profile_email || ""}
                        onChange={(e) => setProfileData({ ...profileData, profile_email: e.target.value })}
                        placeholder="Enter your contact email"
                      />
                      <p className="text-xs text-muted-foreground">This is your contact email (separate from account email)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone || ""}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Birth Date</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={profileData.date_of_birth || ""}
                        onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={profileData.profession || ""}
                      onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                      placeholder="Enter your profession"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={profileData.address || ""}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Enter your address"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                        <Input
                          id="emergency_contact_name"
                          value={profileData.emergency_contact_name || ""}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_name: e.target.value })}
                          placeholder="Enter emergency contact name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                        <Input
                          id="emergency_contact_phone"
                          value={profileData.emergency_contact_phone || ""}
                          onChange={(e) => setProfileData({ ...profileData, emergency_contact_phone: e.target.value })}
                          placeholder="Enter emergency contact phone"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
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
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                // Display Mode - Show Profile Data
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.first_name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.last_name || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Account Email</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{user?.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Contact Email</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.profile_email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Birth Date</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium">{profile?.date_of_birth ? formatDisplayDate(profile.date_of_birth) : 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Profession</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">{profile?.profession || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <div className="p-3 bg-muted/50 rounded-lg border min-h-[60px]">
                      <p className="text-sm font-medium">{profile?.address || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">Emergency Contact Name</Label>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-sm font-medium">{profile?.emergency_contact_name || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">Emergency Contact Phone</Label>
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
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Active</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                <p className="text-sm font-medium">
                  {profile?.created_at ? formatDisplayDate(profile.created_at) : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="text-sm font-medium">
                  {profile?.updated_at ? formatDisplayDate(profile.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}