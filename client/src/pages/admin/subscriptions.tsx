import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Calendar, DollarSign, Edit, Trash2, Eye, CreditCard, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getInitials, formatDate } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Type definitions
type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

type Plan = {
  id: number;
  name: string;
  price: number;
  sessionsIncluded: number;
  durationDays: number;
  duration: number;
};

type Subscription = {
  id: number;
  user_id: string;
  plan_id: number;
  start_date: string;
  end_date: string;
  sessions_remaining: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
  plan?: Plan;
};

type Payment = {
  id: number;
  subscription_id: number;
  user_id: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  payment_date: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// Simplified subscription form schema (no payment fields)
const subscriptionFormSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  notes: z.string().optional(),
  status: z.enum(['active', 'pending', 'expired', 'cancelled']).default('pending'),
});

// Payment form schema
const paymentFormSchema = z.object({
  subscriptionId: z.number(),
  userId: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentType: z.enum(['cash', 'card', 'bank_transfer', 'check', 'other']),
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).default('completed'),
  paymentDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;
type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function AdminSubscriptions() {
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [selectedSubscriptionForPayment, setSelectedSubscriptionForPayment] = useState<Subscription | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Map members from snake_case to camelCase for UI
  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || '',
        lastName: m.lastName || m.last_name || '',
        email: m.email,
        status: m.status,
      }))
    : [];

  // Map snake_case fields to camelCase for UI
  const mappedPlans = Array.isArray(plans)
    ? plans.map((plan: any) => ({
        ...plan,
        sessionsIncluded: plan.max_sessions ?? plan.sessionsIncluded ?? 0,
        duration: plan.duration_days ?? plan.duration ?? 0,
        isActive: plan.is_active ?? plan.isActive ?? true,
      }))
    : [];

  // Map subscriptions with member and plan data
  const mappedSubscriptions = Array.isArray(subscriptions) && Array.isArray(mappedMembers) && Array.isArray(plans)
    ? subscriptions.map((sub: any) => ({
        ...sub,
        member: mappedMembers.find((m: any) => m.id === sub.user_id) || null,
        plan: plans.find((p: any) => p.id === sub.plan_id) || null,
      }))
    : [];

  // Forms
  const subscriptionForm = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      userId: "",
      planId: "",
      startDate: new Date().toISOString().split('T')[0],
      notes: "",
      status: "active",
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      subscriptionId: 0,
      userId: "",
      amount: 0,
      paymentType: "cash",
      paymentStatus: "completed",
      paymentDate: new Date().toISOString().split('T')[0],
      transactionId: "",
      notes: "",
    },
  });

  // Mutations
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
      if (!selectedPlan) throw new Error("Selected plan not found");
      
      const startDateObj = new Date(data.startDate);
      startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan.duration));
      const endDateStr = startDateObj.toISOString().split('T')[0];

      const submitData = {
        userId: data.userId,
        planId: data.planId,
        startDate: data.startDate,
        endDate: endDateStr,
        notes: data.notes,
        status: data.status,
      };
      
      return await apiRequest("POST", "/api/subscriptions", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsSubscriptionModalOpen(false);
      subscriptionForm.reset();
      toast({ title: "Subscription created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating subscription", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      if (!editingSubscription) throw new Error("No subscription selected for editing");
      
      const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
      if (!selectedPlan) throw new Error("Selected plan not found");
      
      const startDateObj = new Date(data.startDate);
      startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan.duration));
      const endDateStr = startDateObj.toISOString().split('T')[0];

      const submitData = {
        userId: data.userId,
        planId: data.planId,
        startDate: data.startDate,
        endDate: endDateStr,
        notes: data.notes,
        status: data.status,
      };
      
      return await apiRequest("PUT", `/api/subscriptions/${editingSubscription.id}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditModalOpen(false);
      setEditingSubscription(null);
      toast({ title: "Subscription updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating subscription",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscription deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error deleting subscription",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const submitData = {
        subscription_id: data.subscriptionId,
        user_id: data.userId,
        amount: data.amount,
        payment_type: data.paymentType,
        payment_status: data.paymentStatus,
        payment_date: data.paymentDate,
        transaction_id: data.transactionId,
        notes: data.notes,
      };
      
      return await apiRequest("POST", "/api/payments", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsPaymentModalOpen(false);
      paymentForm.reset();
      toast({ title: "Payment created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Event handlers
  const openCreateSubscriptionModal = () => {
    subscriptionForm.reset();
    setIsSubscriptionModalOpen(true);
  };

  const openEditModal = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    subscriptionForm.reset({
      userId: subscription.user_id,
      planId: subscription.plan_id.toString(),
      startDate: subscription.start_date.split('T')[0],
      notes: subscription.notes || "",
      status: subscription.status as any,
    });
    setIsEditModalOpen(true);
  };

  const openPaymentModal = (subscription: Subscription) => {
    setSelectedSubscriptionForPayment(subscription);
    paymentForm.reset({
      subscriptionId: subscription.id,
      userId: subscription.user_id,
      amount: subscription.plan?.price || 0,
      paymentType: "cash",
      paymentStatus: "completed",
      paymentDate: new Date().toISOString().split('T')[0],
      transactionId: "",
      notes: "",
    });
    setIsPaymentModalOpen(true);
  };

  const openDetailsModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsModalOpen(true);
  };

  const handleSubscriptionSubmit = (data: SubscriptionFormData) => {
    createSubscriptionMutation.mutate(data);
  };

  const handleEditSubmit = (data: SubscriptionFormData) => {
    updateSubscriptionMutation.mutate(data);
  };

  const handlePaymentSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const handleDeleteSubscription = (id: number) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      deleteSubscriptionMutation.mutate(id);
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = mappedSubscriptions.filter((subscription) =>
    `${subscription.member?.firstName || ''} ${subscription.member?.lastName || ''} ${subscription.plan?.name || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Get payments for a subscription
  const getPaymentsForSubscription = (subscriptionId: number) => {
    return payments.filter(payment => payment.subscription_id === subscriptionId);
  };

  // Utility functions
  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "default";
      case 'pending': return "secondary";
      case 'expired': return "destructive";
      case 'cancelled': return "secondary";
      default: return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return "Active";
      case 'pending': return "Pending";
      case 'expired': return "Expired";
      case 'cancelled': return "Cancelled";
      default: return status;
    }
  };

  // Loading and empty states
  const isLoadingAny = isLoading || !mappedMembers.length || !plans.length;

  if (isLoadingAny) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscriptions</h1>
          <p className="text-muted-foreground">Manage member subscriptions</p>
        </div>
        <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateSubscriptionModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subscription
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Sessions Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow
                  key={subscription.id}
                  className="group cursor-pointer"
                  onClick={e => {
                    // Prevent row click if clicking on actions menu
                    if ((e.target as HTMLElement).closest('.actions-menu')) return;
                    openDetailsModal(subscription);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {getInitials(subscription.member?.firstName || '', subscription.member?.lastName || '')}
                      </div>
                      <div>
                        <div className="font-medium">
                          {subscription.member?.firstName} {subscription.member?.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {subscription.member?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.plan?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(subscription.plan?.price || 0)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(subscription.start_date)}</TableCell>
                  <TableCell>{formatDate(subscription.end_date)}</TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium text-lg">{subscription.sessions_remaining}</div>
                      <div className="text-sm text-muted-foreground">
                        remaining
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(subscription.status)}>
                      {getStatusText(subscription.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="actions-menu">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailsModal(subscription);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(subscription);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentModal(subscription);
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-2" /> Add Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubscription(subscription.id);
                            }} 
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

            {/* Subscription Creation Modal */}
      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Subscription</DialogTitle>
            <DialogDescription>
              Create a new subscription for a member
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(handleSubscriptionSubmit)} className="space-y-6">
              {/* Payment Info Alert at Top */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">Payment Information</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Payment information will be managed separately after creating the subscription.</p>
                  <p>You can add payments using the credit card icon in the subscriptions list.</p>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <h5 className="font-semibold text-xs mb-1">Payment Workflow:</h5>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    <li>1. Create subscription (this step)</li>
                    <li>2. Add payment via the payment button</li>
                    <li>3. Track payment history in subscription details</li>
                  </ol>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-4">
                <Controller
                  name="userId"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedMembers.filter((member) => member.status === 'active').map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="planId"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedPlans.filter((plan) => plan.isActive !== false).map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - {formatPrice(plan.price)} ({plan.sessionsIncluded || 0} sessions, {plan.duration || 0} days)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="startDate"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="status"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="notes"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show plan info if selected */}
                {(() => {
                  const planId = subscriptionForm.watch('planId');
                  if (!planId) {
                    return <div className="text-sm text-muted-foreground border-t pt-2 mt-2">Select a plan to see details.</div>;
                  }
                  const plan = mappedPlans.find((p) => p.id === parseInt(planId));
                  if (!plan) return null;
                  return (
                    <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                      <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                      <div>Duration: <b>{plan.duration || 0} days</b></div>
                      <div>Price: <b>{formatPrice(plan.price)}</b></div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubscriptionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubscriptionMutation.isPending}>
                  {createSubscriptionMutation.isPending ? "Creating..." : "Create Subscription"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

            {/* Edit Subscription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(handleEditSubmit)} className="space-y-6">
              {/* Payment Info Alert at Top */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">Payment Information</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Payment information is managed separately from subscription details.</p>
                  <p>Use the credit card icon in the subscriptions list to add payments.</p>
                </div>
                {editingSubscription && (() => {
                  const subscriptionPayments = getPaymentsForSubscription(editingSubscription.id);
                  if (subscriptionPayments.length === 0) {
                    return (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">No payments recorded for this subscription.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="font-semibold text-xs mb-2">Recent Payments:</h5>
                      <div className="space-y-2">
                        {subscriptionPayments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="border rounded p-2 text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">{formatPrice(payment.amount)}</span>
                              <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                {payment.payment_status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {payment.payment_type} • {formatDate(payment.payment_date)}
                            </div>
                          </div>
                        ))}
                        {subscriptionPayments.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{subscriptionPayments.length - 3} more payments
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Subscription Details */}
              <div className="space-y-4">
                <Controller
                  name="userId"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedMembers.filter((member) => member.status === 'active').map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="planId"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedPlans.filter((plan) => plan.isActive !== false).map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - {formatPrice(plan.price)} ({plan.sessionsIncluded || 0} sessions, {plan.duration || 0} days)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="startDate"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="status"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="notes"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show plan info if selected */}
                {(() => {
                  const planId = subscriptionForm.watch('planId');
                  if (!planId) {
                    return <div className="text-sm text-muted-foreground border-t pt-2 mt-2">Select a plan to see details.</div>;
                  }
                  const plan = mappedPlans.find((p) => p.id === parseInt(planId));
                  if (!plan) return null;
                  return (
                    <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                      <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                      <div>Duration: <b>{plan.duration || 0} days</b></div>
                      <div>Price: <b>{formatPrice(plan.price)}</b></div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSubscriptionMutation.isPending}>
                  {updateSubscriptionMutation.isPending ? "Updating..." : "Update Subscription"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this subscription
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="amount"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="paymentType"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="paymentStatus"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={val => {
                          field.onChange(val);
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="paymentDate"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="transactionId"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Transaction ID..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Controller
                name="notes"
                control={paymentForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Creating..." : "Create Payment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View subscription and payment information
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-6">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Subscription Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Member:</span> {selectedSubscription.member?.firstName} {selectedSubscription.member?.lastName}</div>
                    <div><span className="font-medium">Email:</span> {selectedSubscription.member?.email}</div>
                    <div><span className="font-medium">Plan:</span> {selectedSubscription.plan?.name}</div>
                    <div><span className="font-medium">Price:</span> {formatPrice(selectedSubscription.plan?.price || 0)}</div>
                    <div><span className="font-medium">Start Date:</span> {formatDate(selectedSubscription.start_date)}</div>
                    <div><span className="font-medium">End Date:</span> {formatDate(selectedSubscription.end_date)}</div>
                    <div><span className="font-medium">Sessions Remaining:</span> {selectedSubscription.sessions_remaining} / {selectedSubscription.plan?.sessionsIncluded || 0}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge variant={getStatusColor(selectedSubscription.status)} className="ml-2">
                        {getStatusText(selectedSubscription.status)}
                      </Badge>
          </div>
                    {selectedSubscription.notes && (
                      <div><span className="font-medium">Notes:</span> {selectedSubscription.notes}</div>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h3 className="font-semibold mb-2">Payment History</h3>
                  {(() => {
                    const subscriptionPayments = getPaymentsForSubscription(selectedSubscription.id);
                    if (subscriptionPayments.length === 0) {
                      return <p className="text-sm text-muted-foreground">No payments recorded</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {subscriptionPayments.map((payment) => (
                          <div key={payment.id} className="border rounded p-3 text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{formatPrice(payment.amount)}</div>
                                <div className="text-muted-foreground">{payment.payment_type}</div>
                              </div>
                              <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                                {payment.payment_status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground mt-1">
                              {formatDate(payment.payment_date)}
            </div>
                            {payment.transaction_id && (
                              <div className="text-muted-foreground text-xs">
                                ID: {payment.transaction_id}
                        </div>
                            )}
                        </div>
                        ))}
                      </div>
                    );
                  })()}
                        </div>
                      </div>
                      </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
