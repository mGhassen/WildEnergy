"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Edit, Trash2, User, Shield, MoreHorizontal, Key, Archive, CheckCircle, XCircle, Mail, Star, X, Phone, Calendar, Clock, Activity, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Form schemas
const createUserSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(["admin", "member", "trainer"], { required_error: "Role is required" }),
});

const editUserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    memberNotes: z.string().optional(),
    isAdmin: z.boolean(),
    isMember: z.boolean(),
    isTrainer: z.boolean(),
    status: z.enum(["active", "pending", "archived", "suspended"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

// Helper functions
const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'archived': return 'bg-gray-100 text-gray-800';
        case 'suspended': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// Add confirmed status to User interface
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  memberNotes?: string;
  status: string;
  isAdmin: boolean;
  isMember: boolean;
  isTrainer: boolean;
  createdAt?: string;
  confirmedAt?: string | null; // Add this field
}

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [settingPasswordUser, setSettingPasswordUser] = useState<User | null>(null);
    const [setPasswordValue, setSetPasswordValue] = useState("");
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch users
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["/api/users"],
        queryFn: () => apiRequest("GET", "/api/users"),
    });

    // Helper function to format date for HTML date input
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch {
            return '';
        }
    };

    // Map users from snake_case to camelCase for UI
    const mappedUsers = Array.isArray(users)
        ? users.map((u: any) => ({
            ...u,
            firstName: u.firstName || u.first_name || '',
            lastName: u.lastName || u.last_name || '',
            email: u.email,
            phone: u.phone || '',
            dateOfBirth: formatDateForInput(u.dateOfBirth || u.date_of_birth),
            memberNotes: u.memberNotes || u.member_notes || '',
            status: u.status,
            isAdmin: u.isAdmin || u.is_admin || false,
            isMember: u.isMember || u.is_member || false,
            isTrainer: u.isTrainer || u.is_trainer || false,
            createdAt: u.createdAt || u.created_at,
        })) as User[]
        : [];

    // After fetching users, fetch confirmation status for each user
    useEffect(() => {
      async function fetchConfirmedStatus() {
        if (!Array.isArray(mappedUsers) || mappedUsers.length === 0) return;
        // Only fetch for users without confirmedAt
        const usersToFetch = mappedUsers.filter(u => u.email && u.confirmedAt === undefined);
        if (usersToFetch.length === 0) return;
        // Call backend API to get confirmedAt for each user
        const results = await Promise.all(usersToFetch.map(async (user) => {
          try {
            const res = await apiRequest("POST", "/api/users/get-confirmed-at", { email: user.email });
            return { id: user.id, confirmedAt: res.confirmedAt };
          } catch {
            return { id: user.id, confirmedAt: null };
          }
        }));
        // Update usersMapped with confirmedAt
        results.forEach(({ id, confirmedAt }) => {
          const idx = mappedUsers.findIndex(u => u.id === id);
          if (idx !== -1) mappedUsers[idx].confirmedAt = confirmedAt;
        });
      }
      fetchConfirmedStatus();
      // eslint-disable-next-line
    }, [users]);

    // Filter users
    const filteredUsers = Array.isArray(mappedUsers) ? mappedUsers.filter((user: User) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    // Map fields to camelCase for role rendering
    const usersMapped = filteredUsers.map((user: User) => ({
        ...user,
        isAdmin: user.isAdmin,
        isMember: user.isMember,
        isTrainer: user.isTrainer,
    }));

    // Create user form
    const createForm = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            role: "member",
        },
    });

    // Edit user form
    const editForm = useForm<EditUserForm>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            dateOfBirth: "",
            memberNotes: "",
            isAdmin: false,
            isMember: true,
            isTrainer: false,
            status: "active",
        },
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: CreateUserForm) => {
            // No password field anymore, so just send the data as is
            return await apiRequest("POST", "/api/users", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setShowCreateDialog(false);
            createForm.reset();
            toast({
                title: "User created successfully",
                description: "An invitation email has been sent to the user.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to create user",
                description: error.message || "An error occurred.",
                variant: "destructive",
            });
        },
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<EditUserForm> }) => {
            return await apiRequest("PUT", `/api/users/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setEditingUser(null);
            editForm.reset();
            toast({
                title: "User updated successfully",
                description: "The user information has been updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to update user",
                description: error.message || "An error occurred.",
                variant: "destructive",
            });
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setDeletingUser(null);
            toast({
                title: "User deleted",
                description: "The user has been permanently deleted.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to delete user",
                description: error.message || "An error occurred.",
                variant: "destructive",
            });
        },
    });

    // Quick action mutations
    const quickActionMutation = useMutation({
        mutationFn: async ({ id, action, data }: { id: string; action: string; data?: any }) => {
            switch (action) {
                case 'approve':
                    return await apiRequest("PUT", `/api/users/${id}`, { status: 'active' });
                case 'archive':
                    return await apiRequest("PUT", `/api/users/${id}`, { status: 'archived' });
                case 'suspend':
                    return await apiRequest("PUT", `/api/users/${id}`, { status: 'suspended' });
                case 'reset-password':
                    return await apiRequest("POST", `/api/users/${id}/reset-password`);
                case 'resend-invitation':
                    return await apiRequest("POST", `/api/users/${id}/resend-invitation`);
                default:
                    throw new Error('Unknown action');
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

    // Handle create user
    const handleCreateUser = (data: z.infer<typeof createUserSchema>) => {
        const { role, ...rest } = data;
        createUserMutation.mutate({
            ...rest,
            isAdmin: role === 'admin',
            isMember: role === 'member',
            isTrainer: role === 'trainer',
        });
    };

    // Handle edit user
    const handleEditUser = (data: EditUserForm) => {
        if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, data });
        }
    };

    // Open edit dialog
    const openEditDialog = (user: User) => {
        setEditingUser(user);
        editForm.reset({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            dateOfBirth: user.dateOfBirth || "",
            memberNotes: user.memberNotes || "",
            isAdmin: user.isAdmin || false,
            isMember: user.isMember || false,
            isTrainer: user.isTrainer || false,
            status: (user.status as "active" | "pending" | "archived" | "suspended") || "active",
        });
    };

    // Open view dialog
    const openViewDialog = (user: User) => {
        setViewingUser(user);
    };

    // Handle row click (but not on menu)
    const handleRowClick = (event: React.MouseEvent, user: User) => {
        // Don't trigger if clicking on dropdown menu or buttons
        const target = event.target as HTMLElement;
        if (target.closest('[role="menuitem"]') || target.closest('button')) {
            return;
        }
        openViewDialog(user);
    };

    function generatePassword(length = 12) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading users...</p>
                </div>
            </div>
        );
    }

    const isCreatingUser = createUserMutation.isPending;
    console.log('isCreatingUser:', isCreatingUser);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage user accounts and permissions
                    </p>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>
                                Create a new user account. An invitation email will be sent automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...createForm}>
                            <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                                <FormField
                                    control={createForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="user@example.com" type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Removed password field from dialog */}
                                <FormField
                                    control={createForm.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="First Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Last Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    className="flex flex-row gap-4"
                                                >
                                                    <RadioGroupItem value="admin" id="role-admin" />
                                                    <FormLabel htmlFor="role-admin">Admin</FormLabel>
                                                    <RadioGroupItem value="member" id="role-member" />
                                                    <FormLabel htmlFor="role-member">Member</FormLabel>
                                                    <RadioGroupItem value="trainer" id="role-trainer" />
                                                    <FormLabel htmlFor="role-trainer">Trainer</FormLabel>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isCreatingUser}>
                                        {isCreatingUser ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create User'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} total
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                🟡 {Array.isArray(users) ? users.filter((u: any) => u.status === 'pending').length : 0} Pending
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-300">
                                🟢 {Array.isArray(users) ? users.filter((u: any) => u.status === 'active').length : 0} Active
                            </Badge>
                            <Badge variant="outline" className="text-gray-600 border-gray-300">
                                📦 {Array.isArray(users) ? users.filter((u: any) => u.status === 'archived').length : 0} Archived
                            </Badge>
                            <Badge variant="outline" className="text-red-600 border-red-300">
                                🚫 {Array.isArray(users) ? users.filter((u: any) => u.status === 'suspended').length : 0} Suspended
                            </Badge>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {usersMapped.map((user: User) => (
                                <TableRow 
                                    key={user.id} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={(e) => handleRowClick(e, user)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-primary">
                                                    {getInitials(user.firstName || "", user.lastName || "")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {user.isAdmin && (
                                                <Badge variant="default">
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    Admin
                                                </Badge>
                                            )}
                                            {user.isMember && (
                                                <Badge variant="secondary">
                                                    <User className="w-3 h-3 mr-1" />
                                                    Member
                                                </Badge>
                                            )}
                                            {user.isTrainer && (
                                                <Badge variant="outline">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Trainer
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(user.status)}>
                                            {user.status === 'pending' && '⏳ Pending'}
                                            {user.status === 'active' && '✅ Active'}
                                            {user.status === 'archived' && '📦 Archived'}
                                            {user.status === 'suspended' && '🚫 Suspended'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm text-muted-foreground">
                                            {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {user.status === 'pending' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                                    onClick={() => quickActionMutation.mutate({ id: user.id, action: 'approve' })}
                                                    disabled={quickActionMutation.isPending}
                                                >
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Approve
                                                </Button>
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSettingPasswordUser(user)}>
                                                        <Key className="w-4 h-4 mr-2" />
                                                        Set Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'reset-password' })}>
                                                        <Key className="w-4 h-4 mr-2" />
                                                        Reset Password
                                                    </DropdownMenuItem>
                                                    {user.confirmedAt
                                                      ? <DropdownMenuItem disabled title="User already confirmed. Use Reset Password instead.">
                                                          <Mail className="w-4 h-4 mr-2" />
                                                          Resend Invitation
                                                        </DropdownMenuItem>
                                                      : <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'resend-invitation' })}>
                                                          <Mail className="w-4 h-4 mr-2" />
                                                          Resend Invitation
                                                        </DropdownMenuItem>
                                                    }
                                                    {user.status !== 'archived' && (
                                                        <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'archive' })}>
                                                            <Archive className="w-4 h-4 mr-2" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                    )}
                                                    {user.status !== 'suspended' && (
                                                        <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'suspend' })}>
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Suspend
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => setDeletingUser(user)}
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
                            ))}
                            {filteredUsers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <p className="text-muted-foreground">No users found matching your search.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information and permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="dateOfBirth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date of Birth</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="memberNotes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Member Notes</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Add any notes about this member..."
                                                className="min-h-[80px]"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">✅ Active</SelectItem>
                                                <SelectItem value="pending">⏳ Pending</SelectItem>
                                                <SelectItem value="archived">📦 Archived</SelectItem>
                                                <SelectItem value="suspended">🚫 Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-3">
                                <FormField
                                    control={editForm.control}
                                    name="isAdmin"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Admin User</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="isMember"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Member User</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="isTrainer"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Trainer User</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateUserMutation.isPending}>
                                    {updateUserMutation.isPending ? "Updating..." : "Update User"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View User Dialog */}
            <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            User Profile
                        </DialogTitle>
                        <DialogDescription>
                            Complete user information and account details
                        </DialogDescription>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="space-y-6">
                            {/* Header Section with Avatar and Quick Actions */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                                        <span className="text-2xl font-bold text-primary">
                                            {getInitials(viewingUser.firstName || "", viewingUser.lastName || "")}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground">
                                            {viewingUser.firstName} {viewingUser.lastName}
                                        </h3>
                                        <p className="text-muted-foreground text-lg">{viewingUser.email}</p>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <Badge className={getStatusColor(viewingUser.status)}>
                                                {viewingUser.status === 'pending' && '⏳ Pending'}
                                                {viewingUser.status === 'active' && '✅ Active'}
                                                {viewingUser.status === 'archived' && '📦 Archived'}
                                                {viewingUser.status === 'suspended' && '🚫 Suspended'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-muted-foreground">
                                                Member since {viewingUser.createdAt ? formatDate(viewingUser.createdAt) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                            setViewingUser(null);
                                            openEditDialog(viewingUser);
                                        }}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setViewingUser(null)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Roles Section */}
                            <div className="bg-muted/30 rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-3">ACCOUNT ROLES</h4>
                                <div className="flex items-center space-x-3">
                                    {viewingUser.isAdmin && (
                                        <Badge variant="default" className="px-3 py-1">
                                            <Shield className="w-4 h-4 mr-2" />
                                            Administrator
                                        </Badge>
                                    )}
                                    {viewingUser.isMember && (
                                        <Badge variant="secondary" className="px-3 py-1">
                                            <User className="w-4 h-4 mr-2" />
                                            Member
                                        </Badge>
                                    )}
                                    {viewingUser.isTrainer && (
                                        <Badge variant="outline" className="px-3 py-1">
                                            <Star className="w-4 h-4 mr-2" />
                                            Trainer
                                        </Badge>
                                    )}
                                    {!viewingUser.isAdmin && !viewingUser.isMember && !viewingUser.isTrainer && (
                                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                                    )}
                                </div>
                            </div>

                            {/* Personal Information (single column) */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm text-muted-foreground">PERSONAL INFORMATION</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Full Name</p>
                                            <p className="font-medium">{viewingUser.firstName} {viewingUser.lastName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <Mail className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email Address</p>
                                            <p className="font-medium">{viewingUser.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Phone className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Phone Number</p>
                                            <p className="font-medium">{viewingUser.phone || "Not provided"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                                            <p className="font-medium">{viewingUser.dateOfBirth || "Not provided"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Member Notes Section (always shown) */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-amber-800 mb-2 flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    MEMBER NOTES
                                </h4>
                                <p className="text-sm text-amber-700 leading-relaxed min-h-[32px]">
                                    {viewingUser.memberNotes?.trim() ? viewingUser.memberNotes : <span className="italic text-amber-400">No notes for this user.</span>}
                                </p>
                            </div>

                            {/* Quick Actions */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm text-muted-foreground mb-3">QUICK ACTIONS</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => quickActionMutation.mutate({ id: viewingUser.id, action: 'reset-password' })}
                                        disabled={quickActionMutation.isPending}
                                    >
                                        <Key className="w-4 h-4 mr-2" />
                                        Reset Password
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => quickActionMutation.mutate({ id: viewingUser.id, action: 'resend-invitation' })}
                                        disabled={quickActionMutation.isPending}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Resend Invitation
                                    </Button>
                                    {viewingUser.status === 'pending' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-green-600 border-green-300 hover:bg-green-50"
                                            onClick={() => quickActionMutation.mutate({ id: viewingUser.id, action: 'approve' })}
                                            disabled={quickActionMutation.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve User
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Set Password Dialog */}
            <Dialog open={!!settingPasswordUser} onOpenChange={() => { setSettingPasswordUser(null); setSetPasswordValue(""); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {settingPasswordUser?.firstName} {settingPasswordUser?.lastName}. You can enter a password or generate a strong one.
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
        await apiRequest("POST", `/api/users/${settingPasswordUser.id}/set-password`, { password: setPasswordValue });
        toast({ title: "Password set successfully", description: `Password updated for ${settingPasswordUser.firstName} ${settingPasswordUser.lastName}.` });
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
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete {deletingUser?.firstName} {deletingUser?.lastName}?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}