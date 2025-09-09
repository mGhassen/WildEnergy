"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
    ArrowLeft, 
    User, 
    Mail, 
    Phone, 
    Key, 
    Crown, 
    GraduationCap, 
    Settings,
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
    
    // Roles - simple checkboxes
    isAdmin: z.boolean().default(false),
    isMember: z.boolean().default(false),
    isTrainer: z.boolean().default(false),
    
    // Password
    generatePassword: z.boolean().default(true),
    customPassword: z.string().optional(),
    
    // Advanced fields (optional)
    memberNotes: z.string().optional(),
    memberCredit: z.number().min(0).optional(),
    specialization: z.string().optional(),
    experienceYears: z.number().min(0).optional(),
    bio: z.string().optional(),
    certification: z.string().optional(),
    hourlyRate: z.number().min(0).optional(),
}).refine((data) => {
    // At least one role must be selected
    return data.isAdmin || data.isMember || data.isTrainer;
}, {
    message: "Please select at least one role",
    path: ["isAdmin"]
}).refine((data) => {
    // Password validation
    if (!data.generatePassword && (!data.customPassword || data.customPassword.length < 8)) {
        return false;
    }
    return true;
}, {
    message: "Please provide a password or enable password generation",
    path: ["customPassword"]
});

type CreateAccountForm = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [showAdvanced, setShowAdvanced] = useState(false);
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
            isMember: false,
            isTrainer: false,
            generatePassword: true,
            customPassword: "",
            memberNotes: "",
            memberCredit: 0,
            specialization: "",
            experienceYears: 0,
            bio: "",
            certification: "",
            hourlyRate: 0,
        },
    });

    const watchedGeneratePassword = form.watch("generatePassword");
    const watchedIsMember = form.watch("isMember");
    const watchedIsTrainer = form.watch("isTrainer");

    const generatePassword = (length = 12) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleSubmit = (data: CreateAccountForm) => {
        const password = data.generatePassword ? generatePassword(12) : data.customPassword;
        
        const createData = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: password,
            isAdmin: data.isAdmin,
            memberData: data.isMember ? { 
                memberNotes: data.memberNotes || '', 
                credit: data.memberCredit || 0 
            } : undefined,
            trainerData: data.isTrainer ? { 
                specialization: data.specialization || '', 
                experienceYears: data.experienceYears || 0, 
                bio: data.bio || '', 
                certification: data.certification || '', 
                hourlyRate: data.hourlyRate || 0 
            } : undefined
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

                                    {/* Role Selection */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Roles *</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                                Full system access
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
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
                                                            <FormLabel className="flex items-center">
                                                                <User className="w-4 h-4 mr-2" />
                                                                Member
                                                            </FormLabel>
                                                            <FormDescription>
                                                                Access to classes
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
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
                                                            <FormLabel className="flex items-center">
                                                                <GraduationCap className="w-4 h-4 mr-2" />
                                                                Trainer
                                                            </FormLabel>
                                                            <FormDescription>
                                                                Can teach classes
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormMessage />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Password</Label>
                                        <FormField
                                            control={form.control}
                                            name="generatePassword"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Generate secure password automatically</FormLabel>
                                                        <FormDescription>
                                                            A strong password will be generated and sent via email
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        
                                        {!watchedGeneratePassword && (
                                            <FormField
                                                control={form.control}
                                                name="customPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Custom Password *</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input 
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Enter custom password" 
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
                                        )}
                                    </div>

                                    {/* Advanced Section Toggle */}
                                    <div className="pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className="w-full"
                                        >
                                            <Settings className="w-4 h-4 mr-2" />
                                            {showAdvanced ? "Hide" : "Show"} Advanced Options
                                        </Button>
                                    </div>

                                    {/* Advanced Fields */}
                                    {showAdvanced && (
                                        <div className="space-y-6 pt-4 border-t">
                                            <h3 className="text-lg font-medium">Advanced Settings</h3>
                                            
                                            {/* Member Fields */}
                                            {watchedIsMember && (
                                                <div className="space-y-4">
                                                    <h4 className="font-medium text-muted-foreground">Member Information</h4>
                                                    <FormField
                                                        control={form.control}
                                                        name="memberNotes"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Notes</FormLabel>
                                                                <FormControl>
                                                                    <Textarea 
                                                                        placeholder="Any special notes about this member..." 
                                                                        {...field} 
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="memberCredit"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Initial Credit</FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number" 
                                                                        placeholder="0" 
                                                                        {...field}
                                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            {/* Trainer Fields */}
                                            {watchedIsTrainer && (
                                                <div className="space-y-4">
                                                    <h4 className="font-medium text-muted-foreground">Trainer Information</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="specialization"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Specialization</FormLabel>
                                                                    <FormControl>
                                                                        <Input placeholder="e.g., Yoga, Pilates" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="experienceYears"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Years of Experience</FormLabel>
                                                                    <FormControl>
                                                                        <Input 
                                                                            type="number" 
                                                                            placeholder="0" 
                                                                            {...field}
                                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <FormField
                                                        control={form.control}
                                                        name="bio"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Bio</FormLabel>
                                                                <FormControl>
                                                                    <Textarea 
                                                                        placeholder="Tell us about your fitness background..." 
                                                                        {...field} 
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="certification"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Certification</FormLabel>
                                                                    <FormControl>
                                                                        <Input placeholder="e.g., ACE, NASM" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="hourlyRate"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Hourly Rate (TND)</FormLabel>
                                                                    <FormControl>
                                                                        <Input 
                                                                            type="number" 
                                                                            placeholder="0" 
                                                                            {...field}
                                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            )}
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
                                <h4 className="font-medium">Roles</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• <strong>Admin:</strong> Full system access</li>
                                    <li>• <strong>Member:</strong> Can book classes</li>
                                    <li>• <strong>Trainer:</strong> Can teach classes</li>
                                </ul>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="font-medium">Password</h4>
                                <p className="text-sm text-muted-foreground">
                                    Auto-generated passwords are more secure and will be sent via email to the user.
                                </p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="font-medium">Advanced Options</h4>
                                <p className="text-sm text-muted-foreground">
                                    Use advanced options to set member credits, trainer rates, and other specific details.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
