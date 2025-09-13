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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    Settings,
    MoreHorizontal,
    Link,
    Unlink,
    UserPlus,
    UserMinus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAccount, useUpdateAccount, useDeleteAccount, useLinkAccountTrainer, useUnlinkAccountTrainer, useSetAccountPassword, useApproveAccount, useDisapproveAccount } from "@/hooks/useAccounts";
import { useTrainers } from "@/hooks/useTrainers";
import { Account } from "@/lib/api/accounts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDate } from "@/lib/date";


export default function AccountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.id as string;
    const { user: currentUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [settingPasswordAccount, setSettingPasswordAccount] = useState<Account | null>(null);
    const [setPasswordValue, setSetPasswordValue] = useState("");
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [selectedTrainerId, setSelectedTrainerId] = useState("");
    const [isUnlinkTrainerDialogOpen, setIsUnlinkTrainerDialogOpen] = useState(false);
    const { toast } = useToast();

    // Fetch account data
    const { data: account, isLoading, error } = useAccount(accountId);
    const { data: trainers = [] } = useTrainers();
    const updateAccountMutation = useUpdateAccount();
    const deleteAccountMutation = useDeleteAccount();
    const linkTrainerMutation = useLinkAccountTrainer();
    const unlinkTrainerMutation = useUnlinkAccountTrainer();
    const setPasswordMutation = useSetAccountPassword();
    const approveAccountMutation = useApproveAccount();
    const disapproveAccountMutation = useDisapproveAccount();

    // Filter trainers that are not already linked to accounts
    const availableTrainers = trainers.filter(trainer => 
        !trainer.account_id && trainer.id !== account?.trainer_id
    );

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
                router.push('/admin/accounts');
            }
        });
    };

    // Link trainer to account
    const handleLinkTrainer = () => {
        if (!selectedTrainerId) return;
        
        linkTrainerMutation.mutate(
            { accountId, trainerId: selectedTrainerId },
            {
                onSuccess: () => {
                    setIsLinkDialogOpen(false);
                    setSelectedTrainerId("");
                }
            }
        );
    };

    // Unlink trainer from account
    const handleUnlinkTrainer = () => {
        setIsUnlinkTrainerDialogOpen(true);
    };

    const confirmUnlinkTrainer = () => {
        unlinkTrainerMutation.mutate(accountId, {
            onSuccess: () => {
                setIsUnlinkTrainerDialogOpen(false);
            }
        });
    };

    // Set password
    const handleSetPassword = async () => {
        if (!settingPasswordAccount || !setPasswordValue) return;
        
        setPasswordMutation.mutate({ 
            accountId: settingPasswordAccount.account_id, 
            password: setPasswordValue 
        }, {
            onSuccess: () => {
                setSettingPasswordAccount(null);
                setSetPasswordValue("");
            }
        });
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
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/accounts')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">Account Not Found</h1>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Account not found</h3>
                        <p className="text-muted-foreground mb-4">The requested account could not be found.</p>
                        <Button onClick={() => router.push('/admin/accounts')}>
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
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/accounts')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-foreground">
                                {account.first_name} {account.last_name}
                            </h1>
                            <Badge className={`${getStatusColor(account.account_status)} text-sm px-3 py-1`}>
                                {getStatusIcon(account.account_status)}
                                <span className="ml-2 capitalize">{account.account_status}</span>
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">{account.email}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {!isEditing ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <MoreHorizontal className="w-4 h-4 mr-2" />
                                    Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Account
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSettingPasswordAccount(account)}>
                                    <Key className="w-4 h-4 mr-2" />
                                    Set Password
                                </DropdownMenuItem>
                                {account.trainer_id ? (
                                    <DropdownMenuItem onClick={handleUnlinkTrainer}>
                                        <Unlink className="w-4 h-4 mr-2" />
                                        Unlink Trainer
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => setIsLinkDialogOpen(true)}>
                                        <Link className="w-4 h-4 mr-2" />
                                        Link Trainer
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => {
                                    // TODO: Implement reset password
                                    toast({
                                        title: "Feature coming soon",
                                        description: "Password reset functionality will be available soon.",
                                    });
                                }}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Reset Password
                                </DropdownMenuItem>
                                {account.account_status === 'pending' && (
                                    <>
                                        <DropdownMenuItem onClick={() => {
                                            approveAccountMutation.mutate(account.account_id);
                                        }}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve Account
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            disapproveAccountMutation.mutate(account.account_id);
                                        }}>
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Disapprove Account
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {!account.confirmed_at && (
                                    <DropdownMenuItem onClick={() => {
                                        // TODO: Implement resend invitation
                                        toast({
                                            title: "Feature coming soon",
                                            description: "Resend invitation functionality will be available soon.",
                                        });
                                    }}>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Resend Invitation
                                    </DropdownMenuItem>
                                )}
                                {account.account_status !== 'archived' && (
                                    <DropdownMenuItem onClick={() => {
                                        updateAccountMutation.mutate({
                                            accountId: account.account_id,
                                            accountData: { status: 'archived' }
                                        });
                                    }}>
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archive Account
                                    </DropdownMenuItem>
                                )}
                                {account.account_status !== 'suspended' && (
                                    <DropdownMenuItem onClick={() => {
                                        updateAccountMutation.mutate({
                                            accountId: account.account_id,
                                            accountData: { status: 'suspended' }
                                        });
                                    }}>
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Suspend Account
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => setDeletingAccount(account)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Account
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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

            {/* Status Alerts */}
            {account.account_status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <Clock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">Account Pending Approval</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                This account is waiting for admin approval. The user cannot access the system until approved.
                            </p>
                            <div className="mt-3 flex space-x-2">
                                <Button
                                    size="sm"
                                    onClick={() => approveAccountMutation.mutate(account.account_id)}
                                    disabled={approveAccountMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve Account
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => disapproveAccountMutation.mutate(account.account_id)}
                                    disabled={disapproveAccountMutation.isPending}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {account.account_status === 'archived' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <Archive className="w-5 h-5 text-gray-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-800">Account Archived</h3>
                            <p className="text-sm text-gray-700 mt-1">
                                This account has been archived and the user cannot access the system.
                            </p>
                            <div className="mt-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        updateAccountMutation.mutate({
                                            accountId: account.account_id,
                                            accountData: { status: 'active' }
                                        });
                                    }}
                                    disabled={updateAccountMutation.isPending}
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Reactivate Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {account.account_status === 'suspended' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800">Account Suspended</h3>
                            <p className="text-sm text-red-700 mt-1">
                                This account has been suspended and the user cannot access the system.
                            </p>
                            <div className="mt-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        updateAccountMutation.mutate({
                                            accountId: account.account_id,
                                            accountData: { status: 'active' }
                                        });
                                    }}
                                    disabled={updateAccountMutation.isPending}
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Unsuspend Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                    {/* Trainer Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <GraduationCap className="w-5 h-5" />
                                <span>Trainer Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {account.trainer_id ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                <Link className="w-3 h-3 mr-1" />
                                                Linked to Trainer
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleUnlinkTrainer}
                                            disabled={unlinkTrainerMutation.isPending}
                                        >
                                            <Unlink className="w-3 h-3 mr-1" />
                                            Unlink
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Trainer ID: {account.trainer_id}
                                        </p>
                                        {account.specialization && (
                                            <p className="text-sm">
                                                <span className="font-medium">Specialization:</span> {account.specialization}
                                            </p>
                                        )}
                                        {account.experience_years && (
                                            <p className="text-sm">
                                                <span className="font-medium">Experience:</span> {account.experience_years} years
                                            </p>
                                        )}
                                        {account.hourly_rate && (
                                            <p className="text-sm">
                                                <span className="font-medium">Hourly Rate:</span> ${account.hourly_rate}/hour
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <UserMinus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No Trainer Linked</h3>
                                    <p className="text-muted-foreground mb-4">
                                        This account is not linked to any trainer profile.
                                    </p>
                                    <Button onClick={() => setIsLinkDialogOpen(true)}>
                                        <Link className="w-4 h-4 mr-2" />
                                        Link Trainer
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Account Status & Roles */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Shield className="w-5 h-5" />
                                <span>Account Status & Roles</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Account Status */}
                            <div>
                                <Label htmlFor="accountStatus" className="text-base font-medium">Account Status</Label>
                                {isEditing ? (
                                    <Select
                                        value={editForm.accountStatus}
                                        onValueChange={(value) => setEditForm({...editForm, accountStatus: value})}
                                    >
                                        <SelectTrigger className="mt-2">
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
                                        <Badge className={`${getStatusColor(account.account_status)} text-sm px-3 py-1`}>
                                            {getStatusIcon(account.account_status)}
                                            <span className="ml-2 capitalize">{account.account_status}</span>
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Roles */}
                            <div>
                                <Label className="text-base font-medium">Roles & Permissions</Label>
                                <div className="mt-3 space-y-4">
                                    {/* Admin Role */}
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Crown className="w-5 h-5 text-purple-600" />
                                            <div>
                                                <p className="font-medium">Administrator</p>
                                                <p className="text-sm text-muted-foreground">Full system access and admin privileges</p>
                                            </div>
                                        </div>
                                        {isEditing ? (
                                            <Checkbox
                                                id="isAdmin"
                                                checked={editForm.isAdmin}
                                                onCheckedChange={(checked) => setEditForm({...editForm, isAdmin: !!checked})}
                                            />
                                        ) : (
                                            <Badge variant={account.is_admin ? "default" : "secondary"}>
                                                {account.is_admin ? "Enabled" : "Disabled"}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Member Role Card */}
                                    <div 
                                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                            account.member_id 
                                                ? 'hover:bg-blue-50 cursor-pointer border-blue-200' 
                                                : 'opacity-60'
                                        }`}
                                        onClick={() => account.member_id && router.push('/admin/members')}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <User className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium">Member</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {account.member_id ? 'Click to view members list' : 'Gym membership and class access'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={account.member_id ? "default" : "secondary"}>
                                                {account.member_id ? "View Details" : "Not Assigned"}
                                            </Badge>
                                            {account.member_id && account.member_status && (
                                                <Badge className={`${getStatusColor(account.member_status)} text-xs`}>
                                                    {getStatusIcon(account.member_status)}
                                                    <span className="ml-1 capitalize">{account.member_status}</span>
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trainer Role Card */}
                                    <div 
                                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                            account.trainer_id 
                                                ? 'hover:bg-green-50 cursor-pointer border-green-200' 
                                                : 'opacity-60'
                                        }`}
                                        onClick={() => account.trainer_id && router.push('/admin/trainers')}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <GraduationCap className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium">Trainer</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {account.trainer_id ? 'Click to view trainers list' : 'Class instruction and member training'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={account.trainer_id ? "default" : "secondary"}>
                                                {account.trainer_id ? "View Details" : "Not Assigned"}
                                            </Badge>
                                            {account.trainer_id && account.trainer_status && (
                                                <Badge className={`${getStatusColor(account.trainer_status)} text-xs`}>
                                                    {getStatusIcon(account.trainer_status)}
                                                    <span className="ml-1 capitalize">{account.trainer_status}</span>
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Accessible Portals */}
                            <div>
                                <Label className="text-base font-medium">Accessible Portals</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {account.accessible_portals?.map((portal) => (
                                        <Badge key={portal} variant="outline" className="text-sm px-3 py-1">
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

                </div>

                {/* Sidebar */}
                <div className="space-y-6">
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

            {/* Link Trainer Dialog */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link className="w-5 h-5" />
                            Link Trainer to Account
                        </DialogTitle>
                        <DialogDescription>
                            Select a trainer to link to this account. Only trainers without existing account links are available.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Available Trainers</label>
                            <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a trainer to link" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTrainers.length === 0 ? (
                                        <SelectItem value="" disabled>
                                            No available trainers
                                        </SelectItem>
                                    ) : (
                                        availableTrainers.map((trainer) => (
                                            <SelectItem key={trainer.id} value={trainer.id}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {trainer.first_name} {trainer.last_name}
                                                    </span>
                                                    <span className="text-muted-foreground">({trainer.specialization})</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {availableTrainers.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                                <UserMinus className="w-8 h-8 mx-auto mb-2" />
                                <p>No available trainers to link</p>
                                <p className="text-sm">All trainers are already linked to accounts</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsLinkDialogOpen(false);
                                setSelectedTrainerId("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLinkTrainer}
                            disabled={!selectedTrainerId || linkTrainerMutation.isPending}
                        >
                            {linkTrainerMutation.isPending ? (
                                <>
                                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-background border-t-foreground" />
                                    Linking...
                                </>
                            ) : (
                                <>
                                    <Link className="w-4 h-4 mr-2" />
                                    Link Trainer
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={isUnlinkTrainerDialogOpen}
                onOpenChange={setIsUnlinkTrainerDialogOpen}
                onConfirm={confirmUnlinkTrainer}
                title="Unlink Trainer"
                description="Are you sure you want to unlink this trainer from the account? This action cannot be undone."
                confirmText="Unlink"
                cancelText="Cancel"
                isPending={unlinkTrainerMutation.isPending}
                variant="destructive"
            />
        </div>
    );
}