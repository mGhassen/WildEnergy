"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Edit, Trash2, User, Shield, MoreHorizontal, Key, Archive, CheckCircle, XCircle, Mail, Star, X, Phone, Calendar, Clock, Activity, FileText, Loader2, Eye, Users, UserCheck, UserX, Crown, GraduationCap, CreditCard, MapPin, Briefcase, Heart, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAccounts, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { Account } from "@/lib/api/accounts";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons";


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
        case 'active': return <UserCheck className="w-3 h-3" />;
        case 'pending': return <Clock className="w-3 h-3" />;
        case 'archived': return <Archive className="w-3 h-3" />;
        case 'suspended': return <UserX className="w-3 h-3" />;
        default: return <User className="w-3 h-3" />;
    }
};

const getRoleIcon = (role: string) => {
    switch (role) {
        case 'admin': return <Crown className="w-3 h-3" />;
        case 'member': return <User className="w-3 h-3" />;
        case 'trainer': return <GraduationCap className="w-3 h-3" />;
        default: return <User className="w-3 h-3" />;
    }
};

const getRoleColor = (role: string) => {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'member': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'trainer': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

// Updated Account interface for new system

export default function AccountsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [deletingUser, setDeletingUser] = useState<Account | null>(null);
    const [settingPasswordUser, setSettingPasswordUser] = useState<Account | null>(null);
    const [setPasswordValue, setSetPasswordValue] = useState("");
    const { toast } = useToast();
    const isMobile = useIsMobile();

    // Fetch accounts
    const { data: accounts = [], isLoading, error } = useAccounts();


    // Delete account mutation
    const deleteAccountMutation = useDeleteAccount();

    // Quick action mutations
    const quickActionMutation = useMutation({
        mutationFn: async ({ id, action, data }: { id: string; action: string; data?: any }) => {
            switch (action) {
                case 'approve':
                    return await apiRequest("PUT", `/api/admin/accounts/${id}`, { 
                        accountData: { status: 'active' } 
                    });
                case 'archive':
                    return await apiRequest("PUT", `/api/admin/accounts/${id}`, { 
                        accountData: { status: 'archived' } 
                    });
                case 'suspend':
                    return await apiRequest("PUT", `/api/admin/accounts/${id}`, { 
                        accountData: { status: 'suspended' } 
                    });
                case 'reset-password':
                    return await apiRequest("POST", `/api/admin/accounts/${id}/reset-password`);
                case 'resend-invitation':
                    return await apiRequest("POST", `/api/admin/accounts/${id}/resend-invitation`);
                default:
                    throw new Error('Unknown action');
            }
        },
        onSuccess: (data: any, variables: any) => {
            const actionMessages = {
                'approve': 'User approved successfully',
                'archive': 'User archived successfully',
                'suspend': 'User suspended successfully',
                'reset-password': 'Password reset email sent',
                'resend-invitation': 'Invitation email resent',
            };
            toast({
                title: actionMessages[variables.action as keyof typeof actionMessages],
                description: "The action has been completed.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Action failed",
                description: error.message || "An error occurred.",
                variant: "destructive",
            });
        },
    });


    // Navigate to account detail page
    const navigateToAccount = (account: Account) => {
        window.location.href = `/admin/accounts/${account.account_id}`;
    };

    function generatePassword(length = 12) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Filter accounts
    const filteredAccounts = Array.isArray(accounts) ? accounts.filter((account: any) => {
        const matchesSearch = account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || account.account_status === statusFilter;
        
        const matchesRole = roleFilter === "all" || 
            (roleFilter === "admin" && account.is_admin) ||
            (roleFilter === "member" && account.member_id) ||
            (roleFilter === "trainer" && account.trainer_id);
        
        return matchesSearch && matchesStatus && matchesRole;
    }) : [];

    // Get statistics
    const stats = {
        total: accounts.length,
        active: accounts.filter((u: any) => u.account_status === 'active').length,
        pending: accounts.filter((u: any) => u.account_status === 'pending').length,
        archived: accounts.filter((u: any) => u.account_status === 'archived').length,
        suspended: accounts.filter((u: any) => u.account_status === 'suspended').length,
        admins: accounts.filter((u: any) => u.is_admin).length,
        members: accounts.filter((u: any) => u.member_id).length,
        trainers: accounts.filter((u: any) => u.trainer_id).length,
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
                </div>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Account Management</h1>
                        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                            Manage user accounts, roles, and permissions
                        </p>
                    </div>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Failed to load accounts</h3>
                        <p className="text-muted-foreground mb-4">There was an error loading the account data.</p>
                        <Button onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Account Management</h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                        Manage user accounts, roles, and permissions
                    </p>
                </div>
                <Button 
                    className="w-full sm:w-auto" 
                    onClick={() => window.location.href = '/admin/accounts/create'}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.active}</p>
                                <p className="text-xs text-muted-foreground">Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Archive className="w-4 h-4 text-gray-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.archived}</p>
                                <p className="text-xs text-muted-foreground">Archived</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Crown className="w-4 h-4 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.admins}</p>
                                <p className="text-xs text-muted-foreground">Admins</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.members}</p>
                                <p className="text-xs text-muted-foreground">Members</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.trainers}</p>
                                <p className="text-xs text-muted-foreground">Trainers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <UserX className="w-4 h-4 text-red-600" />
                            <div>
                                <p className="text-2xl font-bold">{stats.suspended}</p>
                                <p className="text-xs text-muted-foreground">Suspended</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search accounts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="trainer">Trainer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Accounts List */}
            <Card>
                <CardHeader>
                    <CardTitle>Accounts</CardTitle>
                    <CardDescription>
                        {filteredAccounts.length} of {stats.total} account{stats.total !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table View */}
                    {!isMobile && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.map((account: any, index: number) => {
                                    // Debug logging
                                    if (index < 3) {
                                        console.log('Account data:', { 
                                            index, 
                                            account_id: account.account_id, 
                                            id: account.id, 
                                            email: account.email 
                                        });
                                    }
                                    return (
                                    <TableRow 
                                        key={account.account_id || account.id || `account-${index}`} 
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (!target.closest('[role="menuitem"]') && !target.closest('button')) {
                                                navigateToAccount(account);
                                            }
                                        }}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-primary">
                                                        {getInitials(account.first_name || "", account.last_name || "")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {account.first_name} {account.last_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{account.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-1">
                                                {account.is_admin && (
                                                    <Badge className={`${getRoleColor('admin')} text-xs`}>
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Admin
                                                    </Badge>
                                                )}
                                                {account.member_id && (
                                                    <Badge className={`${getRoleColor('member')} text-xs`}>
                                                        <User className="w-3 h-3 mr-1" />
                                                        Member
                                                    </Badge>
                                                )}
                                                {account.trainer_id && (
                                                    <Badge className={`${getRoleColor('trainer')} text-xs`}>
                                                        <GraduationCap className="w-3 h-3 mr-1" />
                                                        Trainer
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusColor(account.account_status)} text-xs`}>
                                                {getStatusIcon(account.account_status)}
                                                <span className="ml-1 capitalize">{account.account_status}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-muted-foreground">
                                                {account.last_login ? formatDate(account.last_login) : 'Never'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-muted-foreground">
                                                {account.created_at ? formatDate(account.created_at) : 'N/A'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                {account.account_status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            quickActionMutation.mutate({ id: account.account_id, action: 'approve' });
                                                        }}
                                                        disabled={quickActionMutation.isPending}
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Approve
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigateToAccount(account)}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setSettingPasswordUser(account)}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Set Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'reset-password' })}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        {account.confirmed_at
                                                          ? <DropdownMenuItem disabled title="Account already confirmed. Use Reset Password instead.">
                                                              <Mail className="w-4 h-4 mr-2" />
                                                              Resend Invitation
                                                            </DropdownMenuItem>
                                                          : <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'resend-invitation' })}>
                                                              <Mail className="w-4 h-4 mr-2" />
                                                              Resend Invitation
                                                            </DropdownMenuItem>
                                                        }
                                                        {account.account_status !== 'archived' && (
                                                            <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'archive' })}>
                                                                <Archive className="w-4 h-4 mr-2" />
                                                                Archive
                                                            </DropdownMenuItem>
                                                        )}
                                                        {account.account_status !== 'suspended' && (
                                                            <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'suspend' })}>
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Suspend
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingUser(account)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                                {filteredAccounts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex flex-col items-center space-y-2">
                                                <Users className="w-12 h-12 text-muted-foreground" />
                                                <p className="text-muted-foreground">No accounts found matching your criteria.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {/* Mobile Card View */}
                    {isMobile && (
                        <div className="space-y-3">
                            {filteredAccounts.map((account: any, index: number) => {
                                // Debug logging
                                if (index < 3) {
                                    console.log('Mobile Account data:', { 
                                        index, 
                                        account_id: account.account_id, 
                                        id: account.id, 
                                        email: account.email 
                                    });
                                }
                                return (
                                <Card 
                                    key={account.account_id || account.id || `account-${index}`} 
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (!target.closest('[role="menuitem"]') && !target.closest('button')) {
                                            navigateToAccount(account);
                                        }
                                    }}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-medium text-primary">
                                                        {getInitials(account.first_name || "", account.last_name || "")}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <p className="font-medium text-foreground truncate">
                                                            {account.first_name} {account.last_name}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate mb-2">{account.email}</p>
                                                    
                                                    {/* Role badges and status */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {account.is_admin && (
                                                            <Badge className={`${getRoleColor('admin')} text-xs`}>
                                                                <Crown className="w-3 h-3 mr-1" />
                                                                Admin
                                                            </Badge>
                                                        )}
                                                        {account.member_id && (
                                                            <Badge className={`${getRoleColor('member')} text-xs`}>
                                                                <User className="w-3 h-3 mr-1" />
                                                                Member
                                                            </Badge>
                                                        )}
                                                        {account.trainer_id && (
                                                            <Badge className={`${getRoleColor('trainer')} text-xs`}>
                                                                <GraduationCap className="w-3 h-3 mr-1" />
                                                                Trainer
                                                            </Badge>
                                                        )}
                                                        <Badge className={`${getStatusColor(account.account_status)} text-xs`}>
                                                            {getStatusIcon(account.account_status)}
                                                            <span className="ml-1 capitalize">{account.account_status}</span>
                                                        </Badge>
                                                    </div>
                                                    
                                                    {/* Date */}
                                                    <div className="flex items-center justify-end">
                                                        <p className="text-xs text-muted-foreground">
                                                            {account.created_at ? formatDate(account.created_at) : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex items-center space-x-1 ml-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigateToAccount(account);
                                                    }}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                                {account.account_status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-300 hover:bg-green-50 h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            quickActionMutation.mutate({ id: account.account_id, action: 'approve' });
                                                        }}
                                                        disabled={quickActionMutation.isPending}
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigateToAccount(account)}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setSettingPasswordUser(account)}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Set Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'reset-password' })}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        {account.confirmed_at
                                                          ? <DropdownMenuItem disabled title="Account already confirmed. Use Reset Password instead.">
                                                              <Mail className="w-4 h-4 mr-2" />
                                                              Resend Invitation
                                                            </DropdownMenuItem>
                                                          : <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'resend-invitation' })}>
                                                              <Mail className="w-4 h-4 mr-2" />
                                                              Resend Invitation
                                                            </DropdownMenuItem>
                                                        }
                                                        {account.account_status !== 'archived' && (
                                                            <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'archive' })}>
                                                                <Archive className="w-4 h-4 mr-2" />
                                                                Archive
                                                            </DropdownMenuItem>
                                                        )}
                                                        {account.account_status !== 'suspended' && (
                                                            <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: account.account_id, action: 'suspend' })}>
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Suspend
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingUser(account)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                );
                            })}
                            {filteredAccounts.length === 0 && (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No accounts found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Set Password Dialog */}
            <Dialog open={!!settingPasswordUser} onOpenChange={() => { setSettingPasswordUser(null); setSetPasswordValue(""); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {settingPasswordUser?.first_name} {settingPasswordUser?.last_name}. You can enter a password or generate a strong one.
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
                        <Button type="button" variant="outline" onClick={() => { setSettingPasswordUser(null); setSetPasswordValue(""); }}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={!setPasswordValue} onClick={async () => {
    if (!settingPasswordUser) return;
    try {
        await apiRequest("POST", `/api/admin/accounts/${settingPasswordUser.account_id}/set-password`, { password: setPasswordValue });
        toast({ title: "Password set successfully", description: `Password updated for ${settingPasswordUser.first_name} ${settingPasswordUser.last_name}.` });
        setSettingPasswordUser(null);
        setSetPasswordValue("");
    } catch (error: any) {
        toast({ title: "Failed to set password", description: error.message || "An error occurred.", variant: "destructive" });
    }
}}>
                            Set Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete {deletingUser?.first_name} {deletingUser?.last_name}?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingUser && deleteAccountMutation.mutate(deletingUser.account_id, {
                                onSuccess: () => {
                                    setDeletingUser(null);
                                }
                            })}
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