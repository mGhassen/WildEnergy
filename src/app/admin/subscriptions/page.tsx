"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription, useManualRefundSessions } from "@/hooks/useSubscriptions";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment } from "@/hooks/usePayments";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons";
import { Payment } from "@/lib/api/payments";
import { Plus, Search, Edit, Trash2, Eye, CreditCard, MoreVertical, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { DialogClose } from "@/components/ui/dialog";
import { SubscriptionDetails } from "@/components/subscription-details";

// Type definitions
type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  credit: number; // Added credit field
};

type Plan = {
  id: number;
  name: string;
  price: number;
  sessionsIncluded: number;
  durationDays: number;
  duration: number;
  plan_groups?: Array<{
    id: number;
    group_id: number;
    session_count: number;
    is_free: boolean;
    groups: {
      id: number;
      name: string;
      description: string;
      color: string;
      categories: Array<{
        id: number;
        name: string;
        description: string;
        color: string;
      }>;
    };
  }>;
};

type Subscription = {
  id: number;
  member_id: string;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
  plan?: Plan;
  subscription_group_sessions?: {
    id: number;
    group_id: number;
    sessions_remaining: number;
    total_sessions: number;
    groups: {
      id: number;
      name: string;
      description: string;
      color: string;
    };
  }[];
};


// Simplified subscription form schema (no payment fields)
const subscriptionFormSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  notes: z.string().optional(),
  status: z.enum(['active', 'pending', 'expired', 'cancelled']).optional(),
});

// Payment form schema
const paymentFormSchema = z.object({
  subscription_id: z.number(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(['credit', 'cash', 'card', 'bank_transfer', 'check', 'other']),
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded']).optional(),
  payment_date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  payment_reference: z.string().optional(),
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
  const [, setSelectedSubscriptionForPayment] = useState<Subscription | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isDeletePaymentModalOpen, setIsDeletePaymentModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data: subscriptions } = useSubscriptions();
  const { data: members = [] } = useMembers();
  const { data: plans = [] } = usePlans();
  const { data: payments = [] } = usePayments();

  // Map members from snake_case to camelCase for UI
  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || '',
        lastName: m.lastName || m.last_name || '',
        email: m.email,
        status: m.member_status, // Use member_status from API
        member_status: m.member_status, // Keep original field too
        credit: m.credit || 0, // Map credit field
      }))
    : [];

  // Map snake_case fields to camelCase for UI
  const mappedPlans = Array.isArray(plans)
    ? plans.map((plan: any) => ({
        ...plan,
        sessionsIncluded: plan.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) ?? 0,
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
      memberId: "",
      planId: "",
      startDate: new Date().toISOString().split('T')[0],
      notes: "",
      status: "pending",
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      subscription_id: 0,
      amount: 0,
      payment_method: "cash",
      status: "paid",
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: "",
    },
  });

  // Mutations
  const createSubscriptionMutation = useCreateSubscription();

  const updateSubscriptionMutation = useUpdateSubscription();

  const deleteSubscriptionMutation = useDeleteSubscription();

  // Update createPaymentMutation to accept snake_case fields
  const createPaymentMutation = useCreatePayment();

  // Update updatePaymentMutation to accept snake_case fields
  const updatePaymentMutation = useUpdatePayment();

  // Add a mutation for deleting a payment
  const deletePaymentMutation = useDeletePayment();

  // Helper function to calculate remaining amount for a subscription
  const getRemainingAmount = (subscription: Subscription) => {
    const subscriptionPayments = getPaymentsForSubscription(subscription.id);
    const totalPaid = subscriptionPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Plan price is a number from the API
    const planPrice = Number(subscription.plan?.price) || 0;
    
    // Calculate remaining amount
    const remainingAmount = Math.max(0, planPrice - totalPaid);
    
    return remainingAmount;
  };

  // Event handlers
  const openCreateSubscriptionModal = () => {
    subscriptionForm.reset();
    setIsSubscriptionModalOpen(true);
  };

  const openEditModal = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    subscriptionForm.reset({
      memberId: subscription.member_id,
      planId: subscription.plan_id.toString(),
      startDate: subscription.start_date.split('T')[0],
      notes: subscription.notes || "",
      status: subscription.status as any,
    });
    setIsEditModalOpen(true);
  };

  // 1. Fix openPaymentModal to accept an optional override for payment_method and amount
  const openPaymentModal = (subscription: Subscription, override?: { amount?: number; payment_type?: PaymentFormData['payment_method'] }) => {
    setSelectedSubscriptionForPayment(subscription);
    setSelectedSubscription(subscription); // Set selectedSubscription for the credit button
    
    // Calculate remaining amount if not overridden
    const remainingAmount = override?.amount ?? getRemainingAmount(subscription);
    
    paymentForm.reset({
      subscription_id: subscription.id,
      amount: remainingAmount,
      payment_method: override?.payment_type ?? "cash",
      status: "paid",
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: "",
    });
    setIsPaymentModalOpen(true);
  };

  const openDetailsModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsModalOpen(true);
  };

  const handleSubscriptionSubmit = (data: SubscriptionFormData) => {
    const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
    if (!selectedPlan) {
      toast({ 
        title: "Error", 
        description: "Selected plan not found",
        variant: "destructive" 
      });
      return;
    }
    
    const startDateObj = new Date(data.startDate);
    startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan.duration));
    const endDateStr = startDateObj.toISOString().split('T')[0];

    const submitData = {
      member_id: data.memberId,
      plan_id: parseInt(data.planId),
      start_date: data.startDate,
      end_date: endDateStr,
      notes: data.notes,
      status: data.status || 'pending',
    };
    
    createSubscriptionMutation.mutate(submitData, {
      onSuccess: () => {
        setIsSubscriptionModalOpen(false);
        subscriptionForm.reset();
      }
    });
  };

  const handleEditSubmit = (data: SubscriptionFormData) => {
    if (!editingSubscription) {
      toast({ 
        title: "Error", 
        description: "No subscription selected for editing",
        variant: "destructive" 
      });
      return;
    }
    
    const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
    if (!selectedPlan) {
      toast({ 
        title: "Error", 
        description: "Selected plan not found",
        variant: "destructive" 
      });
      return;
    }
    
    const startDateObj = new Date(data.startDate);
    startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan.duration));
    const endDateStr = startDateObj.toISOString().split('T')[0];

    const submitData = {
      member_id: data.memberId,
      plan_id: parseInt(data.planId),
      start_date: data.startDate,
      end_date: endDateStr,
      notes: data.notes,
      status: data.status || 'pending',
    };
    
    updateSubscriptionMutation.mutate({
      subscriptionId: editingSubscription.id,
      data: submitData
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setEditingSubscription(null);
        subscriptionForm.reset();
      }
    });
  };

  // 3. In handlePaymentSubmit, do not override payment_method, just use data.payment_method
  const handlePaymentSubmit = (data: PaymentFormData) => {
    console.log('Payment form data:', data);
    const paymentPayload = {
      subscription_id: data.subscription_id,
      member_id: selectedSubscription?.member_id || '',
      amount: data.amount,
      payment_method: data.payment_method,
      status: data.status,
      payment_date: data.payment_date,
      payment_reference: data.payment_reference,
    };
    console.log('Payment payload:', paymentPayload);
    if (editingPayment) {
      updatePaymentMutation.mutate({
        paymentId: editingPayment.id,
        data: paymentPayload
      });
    } else {
      createPaymentMutation.mutate(paymentPayload);
    }
  };

  const handleDeleteSubscription = (id: number) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      deleteSubscriptionMutation.mutate(id);
    }
  };

  function handleEditPayment(payment: Payment) {
    setEditingPayment(payment);
    paymentForm.reset({
      subscription_id: payment.subscription_id,
      amount: payment.amount,
      payment_method: (payment.payment_method as "cash" | "card" | "bank_transfer" | "check" | "other") || "cash",
      status: (payment.status as "pending" | "paid" | "failed" | "cancelled") || "paid",
      payment_date: payment.payment_date.split('T')[0],
      payment_reference: payment.payment_reference || '',
    });
    setIsPaymentModalOpen(true);
  }

  function handleDeletePayment(payment: Payment) {
    setPaymentToDelete(payment);
    setIsDeletePaymentModalOpen(true);
  }

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
    return formatCurrency(Number(price));
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return "default";
      case 'pending': return "secondary";
      case 'expired': return "destructive";
      case 'cancelled': return "secondary";
      default: return "outline";
    }
  };

  // Manual refund mutation
  const manualRefundMutation = useManualRefundSessions();

  const handleManualRefund = (subscription: Subscription) => {
    if (subscription.id) {
      manualRefundMutation.mutate({ subscriptionId: subscription.id, sessionsToRefund: 1 });
    }
  };

  // Loading and empty states
  const isLoadingAny = !subscriptions || !mappedMembers.length || !plans.length;

  if (isLoadingAny) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        <TableSkeleton rows={10} columns={7} />
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
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
                <TableHead>Payment Status</TableHead>
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
                      <div className="font-medium text-lg">
                        {subscription.subscription_group_sessions?.reduce((sum: number, group: any) => sum + (group.sessions_remaining || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        remaining
                      </div>
                    </div>
                  </TableCell>
                  {/* Payment Status Badge */}
                  <TableCell>
                    {
                      (() => {
                        const subscriptionPayments = getPaymentsForSubscription(subscription.id);
                        const totalPaid = subscriptionPayments
                          .filter((p) => p.status === 'paid')
                          .reduce((sum, p) => sum + (p.amount || 0), 0);
                        const planPrice = subscription.plan?.price || 0;
                        let status = 'Not Paid';
                        let color: 'default' | 'destructive' | 'secondary' | 'outline' = 'destructive';
                        if (totalPaid >= planPrice && planPrice > 0) {
                          status = 'Fully Paid';
                          color = 'default';
                        } else if (totalPaid > 0 && totalPaid < planPrice) {
                          status = 'Partially Paid';
                          color = 'secondary';
                        }
                        return <Badge variant={color}>{status}</Badge>;
                      })()
                    }
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
                          {/* Payment logic: disable if fully paid */}
                          {(() => {
                            const subscriptionPayments = getPaymentsForSubscription(subscription.id);
                            const totalPaid = subscriptionPayments
                              .filter((p) => p.status === 'paid')
                              .reduce((sum, p) => sum + (p.amount || 0), 0);
                            const planPrice = subscription.plan?.price || 0;
                            if (totalPaid >= planPrice) {
                              return (
                                <DropdownMenuItem disabled>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  <span className="text-green-600">Fully paid</span>
                                </DropdownMenuItem>
                              );
                            }
                            return (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentModal(subscription);
                                }}
                              >
                                <CreditCard className="w-4 h-4 mr-2" /> Add Payment
                              </DropdownMenuItem>
                            );
                          })()}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManualRefund(subscription);
                            }}
                            disabled={manualRefundMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" /> 
                            {manualRefundMutation.isPending ? 'Refunding...' : 'Refund 1 Session'}
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
                  name="memberId"
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
                          {mappedMembers.filter((member) => member.member_status === 'active').map((member) => (
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
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {plan.name} - {formatPrice(plan.price)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {plan.sessionsIncluded || 0} sessions • {plan.duration || 0} days
                                  {plan.plan_groups && plan.plan_groups.length > 0 && (
                                    <span> • {plan.plan_groups.length} group{plan.plan_groups.length > 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
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
                    <div className="text-sm text-muted-foreground border-t pt-2 mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                        <div>Duration: <b>{plan.duration || 0} days</b></div>
                        <div>Price: <b>{formatPrice(plan.price)}</b></div>
                        <div>Groups: <b>{plan.plan_groups?.length || 0}</b></div>
                      </div>
                      {plan.plan_groups && plan.plan_groups.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Included Groups:</div>
                          <div className="space-y-1">
                            {plan.plan_groups.map((group: any) => (
                              <div key={group.id} className="flex items-center gap-2 text-xs">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                />
                                <span className="font-medium">{group.groups?.name}</span>
                                <span className="text-muted-foreground">
                                  ({group.session_count} session{group.session_count > 1 ? 's' : ''}
                                  {group.is_free && ' • FREE'})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
              </div>

              {/* Subscription Details */}
              <div className="space-y-4">
                <Controller
                  name="memberId"
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
                          {mappedMembers.filter((member) => member.member_status === 'active').map((member) => (
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
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {plan.name} - {formatPrice(plan.price)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {plan.sessionsIncluded || 0} sessions • {plan.duration || 0} days
                                  {plan.plan_groups && plan.plan_groups.length > 0 && (
                                    <span> • {plan.plan_groups.length} group{plan.plan_groups.length > 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
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
                    <div className="text-sm text-muted-foreground border-t pt-2 mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                        <div>Duration: <b>{plan.duration || 0} days</b></div>
                        <div>Price: <b>{formatPrice(plan.price)}</b></div>
                        <div>Groups: <b>{plan.plan_groups?.length || 0}</b></div>
                      </div>
                      {plan.plan_groups && plan.plan_groups.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Included Groups:</div>
                          <div className="space-y-1">
                            {plan.plan_groups.map((group: any) => (
                              <div key={group.id} className="flex items-center gap-2 text-xs">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                />
                                <span className="font-medium">{group.groups?.name}</span>
                                <span className="text-muted-foreground">
                                  ({group.session_count} session{group.session_count > 1 ? 's' : ''}
                                  {group.is_free && ' • FREE'})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
          {/* Show member credit at the top */}
          {(() => {
            const subscriptionId = paymentForm.getValues('subscription_id');
            const subscription = mappedSubscriptions.find(s => s.id === subscriptionId);
            const member = subscription?.member;
            if (!member) return null;
            return (
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-700 font-semibold text-lg">Credit: {Number(member.credit) || 0} TND</span>
                {/* 2. Update the Use Credit button to call openPaymentModal with the correct values */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!selectedSubscription) return;
                    const remainingAmount = getRemainingAmount(selectedSubscription);
                    const useAmount = Math.min(Number(member.credit) || 0, remainingAmount);
                    openPaymentModal(selectedSubscription, { amount: useAmount, payment_type: 'credit' });
                  }}
                  disabled={!member.credit || Number(member.credit) <= 0 || !selectedSubscription}
                >
                  Use Credit
                </Button>
              </div>
            );
          })()}
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
                  name="payment_method"
                  control={paymentForm.control}
                  render={({ field }) => {
                    const subscriptionId = paymentForm.getValues('subscription_id');
                    const subscription = mappedSubscriptions.find(s => s.id === subscriptionId);
                    const member = subscription?.member;
                    const hasCredit = member && Number(member.credit) > 0;
                    return (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={val => {
                            field.onChange(val);
                            field.onBlur();
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hasCredit && <SelectItem value="credit">Credit</SelectItem>}
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <Controller
                  name="status"
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
                          <SelectItem value="paid">Paid</SelectItem>
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
                  name="payment_date"
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
                  name="payment_reference"
                  control={paymentForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Payment reference..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


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
          </DialogHeader>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-0 px-6 pt-4 bg-transparent">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent value="details">
                {selectedSubscription && (
                  <SubscriptionDetails 
                    subscription={selectedSubscription as any} 
                    payments={payments as any}
                    showTabs={false}
                    isAdmin={true}
                  />
                )}
              </TabsContent>
              <TabsContent value="payments">
                <Card className="shadow-none border-none bg-transparent">
                  <CardHeader className="p-0 mb-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">Payments</CardTitle>
                    </div>
                    {/* Payment summary row */}
                    {(() => {
                      const subscriptionPayments = selectedSubscription ? getPaymentsForSubscription(selectedSubscription.id) : [];
                      const totalPaid = subscriptionPayments
                        .filter((p) => p.status === 'paid')
                        .reduce((sum, p) => sum + (p.amount || 0), 0);
                      const planPrice = selectedSubscription?.plan?.price || 0;
                      let status = 'Not Paid';
                      let color: 'default' | 'destructive' | 'secondary' | 'outline' = 'destructive';
                      if (totalPaid >= planPrice && planPrice > 0) {
                        status = 'Fully Paid';
                        color = 'default';
                      } else if (totalPaid > 0 && totalPaid < planPrice) {
                        status = 'Partially Paid';
                        color = 'secondary';
                      }
                      return (
                        <div className="flex flex-wrap gap-4 items-center text-sm mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Total Paid:</span>
                            <span className="font-semibold">{formatPrice(totalPaid)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Plan Price:</span>
                            <span className="font-semibold">{formatPrice(planPrice)}</span>
                          </div>
                          <Badge variant={color}>{status}</Badge>
                        </div>
                      );
                    })()}
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const subscriptionPayments = selectedSubscription ? getPaymentsForSubscription(selectedSubscription.id) : [];
                      if (subscriptionPayments.length === 0) {
                        return (
                          <div className="pt-3 border-t">
                            <p className="text-sm text-muted-foreground">No payments recorded for this subscription.</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {subscriptionPayments.map((payment) => (
                            <div key={payment.id} className="border rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center md:justify-between bg-muted/30 shadow-sm gap-2">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                                <span className="font-semibold text-base text-primary">{formatPrice(payment.amount)}</span>
                                <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'} className="ml-2 text-xs capitalize">
                                  {payment.status}
                                </Badge>
                                <span className="text-muted-foreground ml-2">{payment.payment_method} • {formatDate(payment.payment_date)}</span>
                                {payment.payment_reference && (
                                  <span className="text-muted-foreground text-xs ml-2">Ref: {payment.payment_reference}</span>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2 md:mt-0 md:ml-4">
                                <Button size="icon" variant="ghost" onClick={() => handleEditPayment(payment)} title="Edit Payment">
                                  <span className="sr-only">Edit Payment</span>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDeletePayment(payment)} title="Delete Payment">
                                  <span className="sr-only">Delete Payment</span>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payment Delete Confirmation Modal */}
      <Dialog open={isDeletePaymentModalOpen} onOpenChange={setIsDeletePaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeletePaymentModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)} disabled={deletePaymentMutation.isPending}>
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
