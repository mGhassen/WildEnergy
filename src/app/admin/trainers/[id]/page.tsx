"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  UserMinus
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useTrainer, useLinkTrainerAccount, useUnlinkTrainerAccount } from "@/hooks/useTrainers";
import { useAccounts } from "@/hooks/useAccounts";
import { DashboardSkeleton } from "@/components/skeletons";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/date";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export default function TrainerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);

  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const { data: accounts = [] } = useAccounts();
  const linkAccountMutation = useLinkTrainerAccount();
  const unlinkAccountMutation = useUnlinkTrainerAccount();

  // Filter accounts that are not already linked to trainers
  const availableAccounts = accounts.filter(account => 
    !account.trainer_id && account.account_id !== trainer?.account_id
  );

  const handleLinkAccount = () => {
    if (!selectedAccountId) return;
    
    linkAccountMutation.mutate(
      { trainerId, accountId: selectedAccountId },
      {
        onSuccess: () => {
          setIsLinkDialogOpen(false);
          setSelectedAccountId("");
        }
      }
    );
  };

  const handleUnlinkAccount = () => {
    setIsUnlinkDialogOpen(true);
  };

  const confirmUnlinkAccount = () => {
    unlinkAccountMutation.mutate(trainerId, {
      onSuccess: () => {
        setIsUnlinkDialogOpen(false);
      }
    });
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
            <DropdownMenuItem>
              <Eye className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Edit Trainer
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {trainer.account_id ? (
              <DropdownMenuItem onClick={handleUnlinkAccount}>
                <Unlink className="w-4 h-4 mr-2" />
                Unlink Account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setIsLinkDialogOpen(true)}>
                <Link className="w-4 h-4 mr-2" />
                Link Account
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
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
          <Card>
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
                  <p className="font-medium text-foreground">{trainer.email || 'No email (unlinked trainer)'}</p>
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

              {/* Account Link Status */}
              <div className="space-y-2">
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
                        Not Linked
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLinkDialogOpen(true)}
                      >
                        <Link className="w-3 h-3 mr-1" />
                        Link Account
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
              <Button className="w-full justify-start" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </Button>
              <Button className="w-full justify-start" variant="outline">
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
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Link Account to Trainer
            </DialogTitle>
            <DialogDescription>
              Select an account to link to this trainer. Only accounts without existing trainer links are available.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Accounts</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account to link" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.length === 0 ? (
                    <SelectItem value="" disabled>
                      No available accounts
                    </SelectItem>
                  ) : (
                    availableAccounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {account.first_name} {account.last_name}
                          </span>
                          <span className="text-muted-foreground">({account.email})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {availableAccounts.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <UserMinus className="w-8 h-8 mx-auto mb-2" />
                <p>No available accounts to link</p>
                <p className="text-sm">All accounts are already linked to trainers</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkDialogOpen(false);
                setSelectedAccountId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={!selectedAccountId || linkAccountMutation.isPending}
            >
              {linkAccountMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Link Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isUnlinkDialogOpen}
        onOpenChange={setIsUnlinkDialogOpen}
        onConfirm={confirmUnlinkAccount}
        title="Unlink Account"
        description="Are you sure you want to unlink this account from the trainer? This action cannot be undone."
        confirmText="Unlink"
        cancelText="Cancel"
        isPending={unlinkAccountMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
