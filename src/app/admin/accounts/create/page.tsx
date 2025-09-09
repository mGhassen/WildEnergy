"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    ArrowLeft, 
    User, 
    Crown, 
    Key, 
    Eye,
    EyeOff,
    Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAccount } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";

// Simple form schema
const createAccountSchema = z.object({
    // Basic info
    email: z.string().email("Please enter a valid email"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    
    // Admin status
    isAdmin: z.boolean().default(false),
    
    // Account status
    status: z.enum(["active", "pending", "suspended"]).default("active"),
    
    // Account creation method
    creationMethod: z.enum(["password", "invite"]).default("invite"),
    
    // Password (only required if creationMethod is "password")
    customPassword: z.string().optional(),
}).refine((data) => {
    // Password validation - only required if using password method
    if (data.creationMethod === "password" && (!data.customPassword || data.customPassword.length < 8)) {
        return false;
    }
    return true;
}, {
    message: "Please provide a password (min 8 characters) when using password method",
    path: ["customPassword"]
});

type CreateAccountForm = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    
    const createAccountMutation = useCreateAccount();
    
    const form = useForm<CreateAccountForm>({
        resolver: zodResolver(createAccountSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            phone: "",
            isAdmin: false,
            status: "active",
            creationMethod: "invite",
            customPassword: "",
        },
    });

    const watchedCreationMethod = form.watch("creationMethod");

    const generatePassword = (length = 12) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleSubmit = (data: CreateAccountForm) => {
        const createData = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            isAdmin: data.isAdmin,
            status: data.status,
            creationMethod: data.creationMethod,
            password: data.creationMethod === "password" ? data.customPassword : undefined,
        };

        createAccountMutation.mutate(createData, {
            onSuccess: () => {
                toast({
                    title: "Account created successfully",
                    description: "The new account has been created and an invitation email has been sent.",
                });
                router.push("/admin/accounts");
            },
            onError: (error: any) => {
                toast({
                    title: "Failed to create account",
                    description: error.message || "Please try again",
                    variant: "destructive",
                });
            },
        });
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create New Account</h1>
                    <p className="text-muted-foreground">Add a new user to the system</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Account Information
                            </CardTitle>
                            <CardDescription>
                                Enter the basic information for the new account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>First Name *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Last Name *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Doe" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Address *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="john.doe@example.com" type="email" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+1 (555) 123-4567" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Admin Status */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
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
                                                        <FormLabel className="flex items-center">
                                                            <Crown className="w-4 h-4 mr-2" />
                                                            Administrator
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Grant full system access and admin privileges
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Account Status */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Account Status</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="pending">Pending</SelectItem>
                                                            <SelectItem value="suspended">Suspended</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Active accounts can log in immediately, pending accounts need approval
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Account Creation Method */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="creationMethod"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Account Creation Method</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select creation method" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="invite">Send Invitation Email</SelectItem>
                                                            <SelectItem value="password">Set Password Directly</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        {field.value === "invite" 
                                                            ? "User will receive an invitation email to set their own password"
                                                            : "You will set the password and the user can log in immediately"
                                                        }
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Password Field (only shown when using password method) */}
                                    {watchedCreationMethod === "password" && (
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="customPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Password *</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input 
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Enter password for the account" 
                                                                    {...field} 
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                >
                                                                    {showPassword ? (
                                                                        <EyeOff className="h-4 w-4" />
                                                                    ) : (
                                                                        <Eye className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription>
                                                            Password must be at least 8 characters long
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button type="button" variant="outline" onClick={() => router.back()}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={createAccountMutation.isPending}>
                                            {createAccountMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Account"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Tips</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Account Types</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• <strong>Regular:</strong> Standard user account</li>
                                    <li>• <strong>Admin:</strong> Full system access</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium">Status Options</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• <strong>Active:</strong> Can log in immediately</li>
                                    <li>• <strong>Pending:</strong> Needs approval</li>
                                    <li>• <strong>Suspended:</strong> Temporarily disabled</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium">Creation Methods</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• <strong>Invitation:</strong> User sets their own password via email</li>
                                    <li>• <strong>Password:</strong> You set the password directly</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}