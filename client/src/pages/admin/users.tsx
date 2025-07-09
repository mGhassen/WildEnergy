import { useState } from "react";
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
import { Search, Plus, Edit, Trash2, User, Shield, MoreHorizontal, Key, Archive, CheckCircle, XCircle, Mail, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/date";

// Form schemas
const createUserSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .optional()
      .or(z.literal('')),
    isAdmin: z.boolean().default(false),
    isMember: z.boolean().default(true),
    isTrainer: z.boolean().default(false),
});

const editUserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().optional(),
    isAdmin: z.boolean(),
    isMember: z.boolean(),
    status: z.enum(["active", "onhold", "inactive", "suspended"]),
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
        case 'onhold': return 'bg-yellow-100 text-yellow-800';
        case 'inactive': return 'bg-gray-100 text-gray-800';
        case 'suspended': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [deletingUser, setDeletingUser] = useState<any>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch users
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["/api/users"],
        queryFn: () => apiRequest("GET", "/api/users"),
    });

    // Map users from snake_case to camelCase for UI
    const mappedUsers = Array.isArray(users)
        ? users.map((u: any) => ({
            ...u,
            firstName: u.firstName || u.first_name || '',
            lastName: u.lastName || u.last_name || '',
            email: u.email,
            status: u.status,
            isAdmin: u.isAdmin || u.is_admin || false,
            isMember: u.isMember || u.is_member || false,
            isTrainer: u.isTrainer || u.is_trainer || false,
            createdAt: u.createdAt || u.created_at,
        }))
        : [];

    // Filter users
    const filteredUsers = Array.isArray(mappedUsers) ? mappedUsers.filter((user: any) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    // Map fields to camelCase for role rendering
    const usersMapped = filteredUsers.map((user: any) => ({
        ...user,
        isAdmin: user.isAdmin,
        isMember: user.isMember,
        isTrainer: user.isTrainer,
    }));

    // Create user form
    const createForm = useForm<CreateUserForm>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            password: "",
            isAdmin: false,
            isMember: true,
            isTrainer: false,
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
            isAdmin: false,
            isMember: true,
            status: "active",
        },
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: CreateUserForm) => {
            // Remove password if empty or falsy
            const payload = { ...data };
            if (!payload.password) {
                delete payload.password;
            }
            return await apiRequest("POST", "/api/users", payload);
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
                    return await apiRequest("PUT", `/api/users/${id}`, { status: 'inactive' });
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
    const handleCreateUser = (data: CreateUserForm) => {
        createUserMutation.mutate(data);
    };

    // Handle edit user
    const handleEditUser = (data: EditUserForm) => {
        if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, data });
        }
    };

    // Open edit dialog
    const openEditDialog = (user: any) => {
        setEditingUser(user);
        editForm.reset({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            isAdmin: user.isAdmin || false,
            isMember: user.isMember || false,
            status: user.status || "active",
        });
    };

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
                                <FormField
                                    control={createForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password (Optional)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="password" 
                                                    placeholder="Leave empty to send an invitation email" 
                                                    autoComplete="new-password"
                                                    {...field} 
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription className="text-xs text-muted-foreground">
                                                Leave empty to send an invitation email with a password reset link
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
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
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-3">
                                    <FormField
                                        control={createForm.control}
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
                                        control={createForm.control}
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
                                        control={createForm.control}
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
                                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createUserMutation.isPending}>
                                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                                    </Button>
                                </DialogFooter>
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
                                🟡 {Array.isArray(users) ? users.filter((u: any) => u.status === 'onhold').length : 0} Pending
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-300">
                                🟢 {Array.isArray(users) ? users.filter((u: any) => u.status === 'active').length : 0} Active
                            </Badge>
                            <Badge variant="outline" className="text-gray-600 border-gray-300">
                                📦 {Array.isArray(users) ? users.filter((u: any) => u.status === 'inactive').length : 0} Archived
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
                            {usersMapped.map((user: any) => (
                                <TableRow key={user.id}>
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
                                            {user.status === 'onhold' && '⏳ Pending'}
                                            {user.status === 'active' && '✅ Active'}
                                            {user.status === 'inactive' && '📦 Archived'}
                                            {user.status === 'suspended' && '🚫 Suspended'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {user.status === 'onhold' && (
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
                                                    <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'reset-password' })}>
                                                        <Key className="w-4 h-4 mr-2" />
                                                        Reset Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => quickActionMutation.mutate({ id: user.id, action: 'resend-invitation' })}>
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Resend Invitation
                                                    </DropdownMenuItem>
                                                    {user.status !== 'inactive' && (
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