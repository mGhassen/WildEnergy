"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
    ArrowLeft, 
    Edit, 
    Save, 
    X, 
    Trash2, 
    Key, 
    Mail, 
    Phone, 
    Calendar, 
    MapPin, 
    Briefcase, 
    Heart, 
    Crown, 
    User, 
    GraduationCap, 
    CreditCard, 
    Activity, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Archive, 
    AlertTriangle,
    Loader2,
    Shield,
    Star,
    FileText,
    Users,
    Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Account {
  account_id: string;
  email: string;
  account_status: string;
  last_login?: string;
  is_admin: boolean;
  is_member: boolean;
  is_trainer: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  profession?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_image_url?: string;
  member_id?: string;
  member_notes?: string;
  credit?: number;
  member_status?: string;
  subscription_status?: string;
  trainer_id?: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  certification?: string;
  hourly_rate?: number;
  trainer_status?: string;
  user_type: string;
  accessible_portals: string[];
  created_at?: string;
  confirmed_at?: string | null;
}

export default function AccountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.id as string;
    const { user: currentUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [settingPasswordAccount, setSettingPasswordAccount] = useState<Account | null>(null);
    const [setPasswordValue, setSetPasswordValue] = useState("");
    const { toast } = useToast();

    // Fetch account data
    const { data: account, isLoading, error } = useAccount(accountId);
    const updateAccountMutation = useUpdateAccount();
    const deleteAccountMutation = useDeleteAccount();

    // Edit form state
    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        address: "",
        profession: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        accountStatus: "",
        isAdmin: false,
        memberNotes: "",
        credit: 0,
        memberStatus: "",
        specialization: "",
        experienceYears: 0,
        bio: "",
        certification: "",
        hourlyRate: 0,
        trainerStatus: "",
    });

    // Populate edit form when account data changes
    useEffect(() => {
        if (account) {
            setEditForm({
                firstName: account.first_name || "",
                lastName: account.last_name || "",
                email: account.email || "",
                phone: account.phone || "",
                dateOfBirth: account.date_of_birth ? account.date_of_birth.split('T')[0] : "",
                address: account.address || "",
                profession: account.profession || "",
                emergencyContactName: account.emergency_contact_name || "",
                emergencyContactPhone: account.emergency_contact_phone || "",
                accountStatus: account.account_status || "pending",
                isAdmin: account.is_admin || false,
                memberNotes: account.member_notes || "",
                credit: account.credit || 0,
                memberStatus: account.member_status || "inactive",
                specialization: account.specialization || "",
                experienceYears: account.experience_years || 0,
                bio: account.bio || "",
                certification: account.certification || "",
                hourlyRate: account.hourly_rate || 0,
                trainerStatus: account.trainer_status || "inactive",
            });
        }
    }, [account]);

    // Update account
    const handleUpdateAccount = async () => {
        if (!account) return;
        
        const updateData = {
            accountId: account.account_id,
            profileData: {
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                phone: editForm.phone,
                dateOfBirth: editForm.dateOfBirth,
                address: editForm.address,
                profession: editForm.profession,
                emergencyContactName: editForm.emergencyContactName,
                emergencyContactPhone: editForm.emergencyContactPhone,
            },
            accountData: {
                email: editForm.email,
                status: editForm.accountStatus,
                isAdmin: editForm.isAdmin,
            },
            memberData: account.member_id ? {
                memberNotes: editForm.memberNotes,
                credit: editForm.credit,
                status: editForm.memberStatus,
            } : null,
            trainerData: account.trainer_id ? {
                specialization: editForm.specialization,
                experienceYears: editForm.experienceYears,
                bio: editForm.bio,
                certification: editForm.certification,
                hourlyRate: editForm.hourlyRate,
                status: editForm.trainerStatus,
            } : null,
        };

        updateAccountMutation.mutate(updateData, {
            onSuccess: () => {
                setIsEditing(false);
            }
        });
    };

    // Delete account
    const handleDeleteAccount = async () => {
        if (!account) return;
        
        deleteAccountMutation.mutate(account.account_id, {
            onSuccess: () => {
                router.push('/admin/settings/accounts');
            }
        });
    };

    // Set password
    const handleSetPassword = async () => {
        if (!settingPasswordAccount || !setPasswordValue) return;
        
        try {
            await apiRequest("POST", `/api/admin/users/${settingPasswordAccount.account_id}/set-password`, { 
                password: setPasswordValue 
            });
            toast({
                title: "Password set successfully",
                description: `Password updated for ${settingPasswordAccount.first_name} ${settingPasswordAccount.last_name}.`,
            });
            setSettingPasswordAccount(null);
            setSetPasswordValue("");
        } catch (error: any) {
            toast({
                title: "Failed to set password",
                description: error.message || "An error occurred while setting the password.",
                variant: "destructive",
            });
        }
    };

    // Helper functions
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'archived': return <Archive className="w-4 h-4" />;
            case 'suspended': return <XCircle className="w-4 h-4" />;
            default: return <AlertTriangle className="w-4 h-4" />;
        }
    };

    const generatePassword = (length = 12) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-64 bg-muted rounded animate-pulse"></div>
                        <div className="h-64 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-6">
                        <div className="h-32 bg-muted rounded animate-pulse"></div>
                        <div className="h-32 bg-muted rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/settings/accounts')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">Account Not Found</h1>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Account not found</h3>
                        <p className="text-muted-foreground mb-4">The requested account could not be found.</p>
                        <Button onClick={() => router.push('/admin/settings/accounts')}>
                            Back to Accounts
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/settings/accounts')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {account.first_name} {account.last_name}
                        </h1>
                        <p className="text-muted-foreground">{account.email}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Account
                            </Button>
                            <Button variant="outline" onClick={() => setSettingPasswordAccount(account)}>
                                <Key className="w-4 h-4 mr-2" />
                                Set Password
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={() => setDeletingAccount(account)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateAccount}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Account Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <User className="w-5 h-5" />
                                <span>Account Overview</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-xl font-medium text-primary">
                                        {getInitials(account.first_name || "", account.last_name || "")}
                                    </span>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName">First Name</Label>
                                            {isEditing ? (
                                                <Input
                                                    id="firstName"
                                                    value={editForm.firstName}
                                                    onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                                                />
                                            ) : (
                                                <p className="text-sm font-medium">{account.first_name || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="lastName">Last Name</Label>
                                            {isEditing ? (
                                                <Input
                                                    id="lastName"
                                                    value={editForm.lastName}
                                                    onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                                                />
                                            ) : (
                                                <p className="text-sm font-medium">{account.last_name || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        {isEditing ? (
                                            <Input
                                                id="email"
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium flex items-center">
                                                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                                {account.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="phone">Phone</Label>
                                            {isEditing ? (
                                                <Input
                                                    id="phone"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                                />
                                            ) : (
                                                <p className="text-sm font-medium flex items-center">
                                                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                                                    {account.phone || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                            {isEditing ? (
                                                <Input
                                                    id="dateOfBirth"
                                                    type="date"
                                                    value={editForm.dateOfBirth}
                                                    onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                                                />
                                            ) : (
                                                <p className="text-sm font-medium flex items-center">
                                                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                                                    {account.date_of_birth ? formatDate(account.date_of_birth) : 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="address">Address</Label>
                                        {isEditing ? (
                                            <Textarea
                                                id="address"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium flex items-start">
                                                <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5" />
                                                {account.address || 'N/A'}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="profession">Profession</Label>
                                        {isEditing ? (
                                            <Input
                                                id="profession"
                                                value={editForm.profession}
                                                onChange={(e) => setEditForm({...editForm, profession: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium flex items-center">
                                                <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" />
                                                {account.profession || 'N/A'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Emergency Contact */}
                            <div>
                                <h4 className="font-medium mb-3 flex items-center">
                                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                                    Emergency Contact
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="emergencyContactName">Contact Name</Label>
                                        {isEditing ? (
                                            <Input
                                                id="emergencyContactName"
                                                value={editForm.emergencyContactName}
                                                onChange={(e) => setEditForm({...editForm, emergencyContactName: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.emergency_contact_name || 'N/A'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                                        {isEditing ? (
                                            <Input
                                                id="emergencyContactPhone"
                                                value={editForm.emergencyContactPhone}
                                                onChange={(e) => setEditForm({...editForm, emergencyContactPhone: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.emergency_contact_phone || 'N/A'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Roles and Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Shield className="w-5 h-5" />
                                <span>Roles & Permissions</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="isAdmin"
                                        checked={isEditing ? editForm.isAdmin : account.is_admin}
                                        onCheckedChange={isEditing ? (checked) => setEditForm({...editForm, isAdmin: !!checked}) : undefined}
                                        disabled={!isEditing}
                                    />
                                    <Label htmlFor="isAdmin" className="flex items-center space-x-2">
                                        <Crown className="w-4 h-4 text-purple-600" />
                                        <span>Administrator</span>
                                    </Label>
                                </div>
                                {account.is_member && (
                                    <div className="flex items-center space-x-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium">Member</span>
                                    </div>
                                )}
                                {account.is_trainer && (
                                    <div className="flex items-center space-x-2">
                                        <GraduationCap className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium">Trainer</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="accountStatus">Account Status</Label>
                                {isEditing ? (
                                    <Select
                                        value={editForm.accountStatus}
                                        onValueChange={(value) => setEditForm({...editForm, accountStatus: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="mt-2">
                                        <Badge className={`${getStatusColor(account.account_status)} text-xs`}>
                                            {getStatusIcon(account.account_status)}
                                            <span className="ml-1 capitalize">{account.account_status}</span>
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label>Accessible Portals</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {account.accessible_portals?.map((portal) => (
                                        <Badge key={portal} variant="outline" className="text-xs">
                                            {portal === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                                            {portal === 'member' && <User className="w-3 h-3 mr-1" />}
                                            {portal === 'trainer' && <GraduationCap className="w-3 h-3 mr-1" />}
                                            {portal}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Member Information */}
                    {account.member_id && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <User className="w-5 h-5" />
                                    <span>Member Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="memberNotes">Member Notes</Label>
                                        {isEditing ? (
                                            <Textarea
                                                id="memberNotes"
                                                value={editForm.memberNotes}
                                                onChange={(e) => setEditForm({...editForm, memberNotes: e.target.value})}
                                                rows={3}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.member_notes || 'No notes'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="credit">Credit Balance</Label>
                                        {isEditing ? (
                                            <Input
                                                id="credit"
                                                type="number"
                                                value={editForm.credit}
                                                onChange={(e) => setEditForm({...editForm, credit: Number(e.target.value)})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium flex items-center">
                                                <CreditCard className="w-4 h-4 mr-2 text-muted-foreground" />
                                                {account.credit || 0} TND
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="memberStatus">Member Status</Label>
                                    {isEditing ? (
                                        <Select
                                            value={editForm.memberStatus}
                                            onValueChange={(value) => setEditForm({...editForm, memberStatus: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="mt-2">
                                            <Badge className={`${getStatusColor(account.member_status || 'inactive')} text-xs`}>
                                                {getStatusIcon(account.member_status || 'inactive')}
                                                <span className="ml-1 capitalize">{account.member_status || 'inactive'}</span>
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Trainer Information */}
                    {account.trainer_id && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <GraduationCap className="w-5 h-5" />
                                    <span>Trainer Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="specialization">Specialization</Label>
                                        {isEditing ? (
                                            <Input
                                                id="specialization"
                                                value={editForm.specialization}
                                                onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.specialization || 'N/A'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="experienceYears">Experience (Years)</Label>
                                        {isEditing ? (
                                            <Input
                                                id="experienceYears"
                                                type="number"
                                                value={editForm.experienceYears}
                                                onChange={(e) => setEditForm({...editForm, experienceYears: Number(e.target.value)})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.experience_years || 0} years</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="bio">Bio</Label>
                                    {isEditing ? (
                                        <Textarea
                                            id="bio"
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                            rows={3}
                                        />
                                    ) : (
                                        <p className="text-sm font-medium">{account.bio || 'No bio provided'}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="certification">Certification</Label>
                                        {isEditing ? (
                                            <Input
                                                id="certification"
                                                value={editForm.certification}
                                                onChange={(e) => setEditForm({...editForm, certification: e.target.value})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium">{account.certification || 'N/A'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="hourlyRate">Hourly Rate (TND)</Label>
                                        {isEditing ? (
                                            <Input
                                                id="hourlyRate"
                                                type="number"
                                                value={editForm.hourlyRate}
                                                onChange={(e) => setEditForm({...editForm, hourlyRate: Number(e.target.value)})}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium flex items-center">
                                                <CreditCard className="w-4 h-4 mr-2 text-muted-foreground" />
                                                {account.hourly_rate || 0} TND/hour
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="trainerStatus">Trainer Status</Label>
                                    {isEditing ? (
                                        <Select
                                            value={editForm.trainerStatus}
                                            onValueChange={(value) => setEditForm({...editForm, trainerStatus: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="mt-2">
                                            <Badge className={`${getStatusColor(account.trainer_status || 'inactive')} text-xs`}>
                                                {getStatusIcon(account.trainer_status || 'inactive')}
                                                <span className="ml-1 capitalize">{account.trainer_status || 'inactive'}</span>
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Account Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Account Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl font-medium text-primary">
                                        {getInitials(account.first_name || "", account.last_name || "")}
                                    </span>
                                </div>
                                <Badge className={`${getStatusColor(account.account_status)} text-sm`}>
                                    {getStatusIcon(account.account_status)}
                                    <span className="ml-1 capitalize">{account.account_status}</span>
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Account ID</span>
                                <span className="font-mono text-xs">{account.account_id}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Created</span>
                                <span>{account.created_at ? formatDate(account.created_at) : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Login</span>
                                <span>{account.last_login ? formatDate(account.last_login) : 'Never'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Email Confirmed</span>
                                <span className="flex items-center">
                                    {account.confirmed_at ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => setSettingPasswordAccount(account)}
                            >
                                <Key className="w-4 h-4 mr-2" />
                                Set Password
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => {
                                    // TODO: Implement reset password
                                    toast({
                                        title: "Feature coming soon",
                                        description: "Password reset functionality will be available soon.",
                                    });
                                }}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Reset Password
                            </Button>
                            {!account.confirmed_at && (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start"
                                    onClick={() => {
                                        // TODO: Implement resend invitation
                                        toast({
                                            title: "Feature coming soon",
                                            description: "Resend invitation functionality will be available soon.",
                                        });
                                    }}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Resend Invitation
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Set Password Dialog */}
            <Dialog open={!!settingPasswordAccount} onOpenChange={() => { setSettingPasswordAccount(null); setSetPasswordValue(""); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {settingPasswordAccount?.first_name} {settingPasswordAccount?.last_name}. 
                            You can enter a password or generate a strong one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                placeholder="Enter new password"
                                value={setPasswordValue}
                                onChange={e => setSetPasswordValue(e.target.value)}
                                autoFocus
                            />
                            <Button type="button" variant="outline" onClick={() => setSetPasswordValue(generatePassword())}>
                                Generate
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setSettingPasswordAccount(null); setSetPasswordValue(""); }}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={!setPasswordValue} onClick={handleSetPassword}>
                            Set Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete {deletingAccount?.first_name} {deletingAccount?.last_name}?
                            This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}