"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    ArrowLeft, 
    User, 
    Crown, 
    Key, 
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Shield,
    CheckCircle,
    AlertCircle,
    Info,
    Sparkles,
    Dumbbell,
    GraduationCap,
    Star
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
    isAdmin: z.boolean(),
    
    // Account status
    status: z.enum(["active", "pending", "suspended"]),
    
    // Account creation method
    creationMethod: z.enum(["password", "invite"]),
    
    // Password (only required if creationMethod is "password")
    customPassword: z.string().optional(),
    
    // Member data
    createAsMember: z.boolean(),
    memberNotes: z.string().optional(),
    credit: z.number().min(0).optional(),
    
    // Trainer data
    createAsTrainer: z.boolean(),
    specialization: z.string().optional(),
    experienceYears: z.number().min(0).optional(),
    bio: z.string().optional(),
    certification: z.string().optional(),
    hourlyRate: z.number().min(0).optional(),
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
            createAsMember: true, // Default to creating as member
            memberNotes: "",
            credit: 0,
            createAsTrainer: false, // Default to not creating as trainer
            specialization: "",
            experienceYears: 0,
            bio: "",
            certification: "",
            hourlyRate: 0,
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
            // Include member data if creating as member
            ...(data.createAsMember && {
                memberData: {
                    memberNotes: data.memberNotes || '',
                    credit: data.credit || 0,
                }
            }),
            // Include trainer data if creating as trainer
            ...(data.createAsTrainer && {
                trainerData: {
                    specialization: data.specialization || '',
                    experienceYears: data.experienceYears || 0,
                    bio: data.bio || '',
                    certification: data.certification || '',
                    hourlyRate: data.hourlyRate || 0,
                }
            })
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
            {/* Enhanced Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-muted/50">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-primary" />
                            Create New Account
                        </h1>
                        <p className="text-muted-foreground">Add a new user to the system with flexible options</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        <Info className="w-3 h-3 mr-1" />
                        Quick Setup
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <Card className="border-2 border-dashed border-muted/50 hover:border-muted transition-colors">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                Account Information
                            </CardTitle>
                            <CardDescription className="text-base">
                                Enter the basic information for the new account. All fields marked with * are required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Personal Details</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                            First Name <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                placeholder="Enter first name" 
                                                                className="h-11"
                                                                {...field} 
                                                            />
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
                                                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                            Last Name <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                placeholder="Enter last name" 
                                                                className="h-11"
                                                                {...field} 
                                                            />
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
                                                    <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                        Email Address <span className="text-destructive">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                            <Input 
                                                                placeholder="john.doe@example.com" 
                                                                type="email" 
                                                                className="h-11 pl-10"
                                                                {...field} 
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        This will be used for login and notifications
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="+1 (555) 123-4567" 
                                                            className="h-11"
                                                            {...field} 
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Optional - for emergency contacts and notifications
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Admin Status */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Access Level</h3>
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="isAdmin"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                className="mt-1"
                                                            />
                                                        </FormControl>
                                                        <div className="space-y-2 flex-1">
                                                            <FormLabel className="flex items-center gap-2 text-base font-medium cursor-pointer">
                                                                <Crown className="w-5 h-5 text-amber-500" />
                                                                Administrator Access
                                                            </FormLabel>
                                                            <FormDescription className="text-sm">
                                                                Grant full system access, user management, and admin privileges
                                                            </FormDescription>
                                                            {field.value && (
                                                                <Alert className="mt-3">
                                                                    <Shield className="h-4 w-4" />
                                                                    <AlertDescription className="text-xs">
                                                                        This user will have complete access to all system features and data.
                                                                    </AlertDescription>
                                                                </Alert>
                                                            )}
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Account Status */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Account Status</h3>
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Initial Status</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11">
                                                                <SelectValue placeholder="Select initial status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="min-w-[280px]">
                                                            <SelectItem value="active" className="py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                                    <span>Active - Can log in immediately</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="pending" className="py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                                    <span>Pending - Needs approval</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="suspended" className="py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                                    <span>Suspended - Temporarily disabled</span>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-xs">
                                                        Choose the initial status for this account
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Account Creation Method */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Access Method</h3>
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="creationMethod"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">How should this user access their account?</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11">
                                                                <SelectValue placeholder="Select access method" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="min-w-[280px]">
                                                            <SelectItem value="invite" className="py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                                    <span>Send Invitation Email</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="password" className="py-2">
                                                                <div className="flex items-center gap-3">
                                                                    <Key className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                                    <span>Set Password Directly</span>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription className="text-xs">
                                                        {field.value === "invite" 
                                                            ? "User will receive an invitation email to set their own password (recommended for external users)"
                                                            : "You will set the password and the user can log in immediately (useful for internal accounts)"
                                                        }
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Password Field (only shown when using password method) */}
                                    {watchedCreationMethod === "password" && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <h3 className="font-semibold text-lg">Password Setup</h3>
                                            </div>
                                            
                                            <FormField
                                                control={form.control}
                                                name="customPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                            Account Password <span className="text-destructive">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                                <Input 
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Enter a secure password" 
                                                                    className="h-11 pl-10 pr-12"
                                                                    {...field} 
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
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
                                                        <FormDescription className="text-xs flex items-center gap-2">
                                                            Password must be at least 8 characters long. Use a combination of letters, numbers, and symbols for better security.
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newPassword = generatePassword(12);
                                                                    form.setValue("customPassword", newPassword);
                                                                }}
                                                                className="text-primary hover:text-primary/80 underline text-xs font-medium"
                                                            >
                                                                Generate Password
                                                            </button>
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            
                                            <Alert>
                                                <Info className="h-4 w-4" />
                                                <AlertDescription className="text-xs">
                                                    <strong>Security Tip:</strong> Choose a strong password that the user can easily remember, or share it securely through a separate channel.
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {/* Member Data Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Member Information</h3>
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="createAsMember"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="text-sm font-medium">
                                                            Create as Member
                                                        </FormLabel>
                                                        <FormDescription className="text-xs">
                                                            Enable this to create a member record along with the account
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {form.watch("createAsMember") && (
                                            <div className="space-y-4 pl-6 border-l-2 border-blue-100">
                                                <FormField
                                                    control={form.control}
                                                    name="memberNotes"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                Member Notes
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    placeholder="Optional notes about this member"
                                                                    {...field} 
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">
                                                                Internal notes about this member (not visible to them)
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                
                                                <FormField
                                                    control={form.control}
                                                    name="credit"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                Initial Credit
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">
                                                                Starting credit balance for this member
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Trainer Data Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            <h3 className="font-semibold text-lg">Trainer Information</h3>
                                        </div>
                                        
                                        <FormField
                                            control={form.control}
                                            name="createAsTrainer"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                            <Dumbbell className="w-4 h-4 text-purple-500" />
                                                            Create as Trainer
                                                        </FormLabel>
                                                        <FormDescription className="text-xs">
                                                            Enable this to create a trainer record along with the account
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {form.watch("createAsTrainer") && (
                                            <div className="space-y-4 pl-6 border-l-2 border-purple-100">
                                                <FormField
                                                    control={form.control}
                                                    name="specialization"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                                <Star className="w-4 h-4 text-purple-500" />
                                                                Specialization
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    placeholder="e.g., Personal Training, Yoga, CrossFit"
                                                                    {...field} 
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">
                                                                Primary area of expertise
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="experienceYears"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-medium">
                                                                    Experience (Years)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="0"
                                                                        {...field}
                                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription className="text-xs">
                                                                    Years of training experience
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    
                                                    <FormField
                                                        control={form.control}
                                                        name="hourlyRate"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-medium">
                                                                    Hourly Rate (TND)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        placeholder="0.00"
                                                                        {...field}
                                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription className="text-xs">
                                                                    Rate per hour in TND
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                
                                                <FormField
                                                    control={form.control}
                                                    name="certification"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                                <GraduationCap className="w-4 h-4 text-purple-500" />
                                                                Certification
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    placeholder="e.g., NASM-CPT, ACE, ISSA"
                                                                    {...field} 
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">
                                                                Professional certifications held
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                
                                                <FormField
                                                    control={form.control}
                                                    name="bio"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                Bio
                                                            </FormLabel>
                                                            <FormControl>
                                                                <textarea 
                                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    placeholder="Brief description of training philosophy and experience..."
                                                                    {...field} 
                                                                />
                                                            </FormControl>
                                                            <FormDescription className="text-xs">
                                                                Brief description of training philosophy and experience
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>Ready to create account</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => router.back()}
                                                className="min-w-[100px]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                disabled={createAccountMutation.isPending}
                                                className="min-w-[140px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                                            >
                                                {createAccountMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        Create Account
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                {/* Enhanced Sidebar */}
                <div className="space-y-6">
                    {/* Quick Reference */}
                    <Card className="border-2 border-dashed border-muted/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                Quick Reference
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    Access Levels
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <div className="text-sm">
                                            <div className="font-medium">Regular User</div>
                                            <div className="text-xs text-muted-foreground">Standard account access</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                        <div className="text-sm">
                                            <div className="font-medium">Administrator</div>
                                            <div className="text-xs text-muted-foreground">Full system control</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    Account Status
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Active</div>
                                            <div className="text-xs text-muted-foreground">Immediate access</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Pending</div>
                                            <div className="text-xs text-muted-foreground">Needs approval</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Suspended</div>
                                            <div className="text-xs text-muted-foreground">Temporarily disabled</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Key className="w-4 h-4 text-purple-500" />
                                    Access Methods
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <Mail className="w-4 h-4 text-blue-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Email Invitation</div>
                                            <div className="text-xs text-muted-foreground">User sets password</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                        <Key className="w-4 h-4 text-green-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Direct Password</div>
                                            <div className="text-xs text-muted-foreground">You set password</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4 text-purple-500" />
                                    Account Types
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <User className="w-4 h-4 text-blue-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Member</div>
                                            <div className="text-xs text-muted-foreground">Gym member access</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                        <Dumbbell className="w-4 h-4 text-purple-500" />
                                        <div className="text-sm">
                                            <div className="font-medium">Trainer</div>
                                            <div className="text-xs text-muted-foreground">Staff trainer access</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Best Practices */}
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Best Practices
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm space-y-2">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Use email invitations for external users</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Set passwords directly for internal accounts</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Start with "Pending" status for new users</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Grant admin access only when necessary</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Create trainer accounts for staff members</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Include specialization and experience details</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 