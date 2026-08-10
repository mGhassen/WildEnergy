"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  DollarSign, 
  User, 
  Clock,
  MoreVertical,
  Settings,
  Eye,
  Download,
  Link,
  Unlink,
  UserPlus,
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useTrainer, useUnlinkTrainerAccount } from "@/hooks/useTrainers";
import { useToast } from "@/hooks/use-toast";
import { DashboardSkeleton } from "@/components/skeletons";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function TrainerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;

  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const unlinkAccountMutation = useUnlinkTrainerAccount();
  const { toast } = useToast();

  const goToEditTrainer = () => {
    router.push(`/admin/trainers/${trainerId}/edit`);
  };

  const goToAccountSettings = () => {
    if (!trainer?.account_id) {
      toast({
        title: "No linked account",
        description: "Link an account first to open account settings.",
        variant: "destructive",
      });
      return;
    }
    router.push(`/admin/accounts/${trainer.account_id}`);
  };

  const goToSchedule = () => {
    router.push("/admin/agenda");
  };

  const exportTrainerData = async () => {
    if (!trainer) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(trainer, null, 2));
      toast({ title: "Copied", description: "Trainer data copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not write to clipboard.",
        variant: "destructive",
      });
    }
  };


  const scrollToProfile = () => {
    document.getElementById("trainer-personal-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Filter accounts that are not already linked to trainers


  const handleUnlinkAccount = () => {
    router.push(`/admin/trainers/${trainerId}/unlink`);
  };


  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !trainer) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Trainer Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The trainer you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/admin/trainers')}>
                View All Trainers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {trainer.first_name} {trainer.last_name}
            </h1>
            <p className="text-muted-foreground">Trainer Details</p>
          </div>
        </div>
        
        {/* Action Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={scrollToProfile}>
              <Eye className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={goToEditTrainer}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Trainer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={goToAccountSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {trainer.member_id && (
              <DropdownMenuItem
                onClick={() => router.push(`/admin/members/${trainer.member_id}`)}
              >
                <User className="w-4 h-4 mr-2" />
                View Member
              </DropdownMenuItem>
            )}
            {trainer.account_id ? (
              <DropdownMenuItem onClick={handleUnlinkAccount}>
                <Unlink className="w-4 h-4 mr-2" />
                Unlink Account
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/admin/trainers/${trainerId}/create-account`)
                  }
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/trainers/${trainerId}/link`)}
                >
                  <Link className="w-4 h-4 mr-2" />
                  Link Account
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exportTrainerData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => router.push(`/admin/trainers/${trainerId}/delete`)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Trainer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card id="trainer-personal-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-lg">
                    {getInitials(trainer.first_name, trainer.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {trainer.first_name} {trainer.last_name}
                    </h3>
                    <Badge className={getStatusColor(trainer.status)}>
                      {trainer.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{trainer.specialization}</p>
                  {trainer.bio && (
                    <p className="text-sm text-muted-foreground mt-2">{trainer.bio}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.email || trainer.profile_email || "No email"}
                  </p>
                  {!trainer.email && trainer.profile_email && (
                    <p className="text-xs text-muted-foreground">Contact email (no login)</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.phone || 'Not provided'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Same-person roles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member role:</span>
                  </div>
                  {trainer.member_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/members/${trainer.member_id}`)
                      }
                    >
                      View Member
                    </Button>
                  ) : (
                    <Badge variant="secondary">No member role</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Account Status:</span>
                  </div>
                  {trainer.account_id ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <Link className="w-3 h-3 mr-1" />
                        Linked
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnlinkAccount}
                        disabled={unlinkAccountMutation.isPending}
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Unlink className="w-3 h-3 mr-1" />
                        No login
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/trainers/${trainerId}/create-account`,
                          )
                        }
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Create
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/trainers/${trainerId}/link`)
                        }
                      >
                        <Link className="w-3 h-3 mr-1" />
                        Link
                      </Button>
                    </div>
                  )}
                </div>
                {trainer.account_id && (
                  <p className="text-xs text-muted-foreground">
                    Account ID: {trainer.account_id}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Specialization:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.specialization || 'Not specified'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Experience:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.experience_years ? `${trainer.experience_years} years` : 'Not specified'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hourly Rate:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.hourly_rate ? `$${trainer.hourly_rate}/hour` : 'Not set'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Certification:</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {trainer.certification || 'Not provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button type="button" className="w-full justify-start" variant="outline" onClick={goToEditTrainer}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              {trainer.account_id ? (
                <Button type="button" className="w-full justify-start" variant="outline" onClick={goToAccountSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/trainers/${trainerId}/create-account`)
                  }
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </Button>
              )}
              {trainer.member_id && (
                <Button
                  type="button"
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/members/${trainer.member_id}`)
                  }
                >
                  <User className="w-4 h-4 mr-2" />
                  View Member
                </Button>
              )}
              <Button type="button" className="w-full justify-start" variant="outline" onClick={goToSchedule}>
                <Calendar className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Account Linking */}
          <Card 
            className={`border-l-4 ${trainer.account_id ? 'border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow' : 'border-l-orange-500'}`}
            onClick={trainer.account_id ? () => router.push(`/admin/accounts/${trainer.account_id}`) : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Linking</CardTitle>
            </CardHeader>
            <CardContent>
              {trainer.account_id ? (
                <div className="space-y-2">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <Link className="w-3 h-3 mr-1" />
                    Linked
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Account ID: {trainer.account_id}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Click to view account details →
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    <Unlink className="w-3 h-3 mr-1" />
                    Not Linked
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    This trainer is not linked to any account
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessible Portals */}
          {trainer.accessible_portals && trainer.accessible_portals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accessible Portals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trainer.accessible_portals.map((portal: string) => (
                    <Badge key={portal} variant="outline">
                      {portal}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Link Account Dialog */}
    </div>
  );
}