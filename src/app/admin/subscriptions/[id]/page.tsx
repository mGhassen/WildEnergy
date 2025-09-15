"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, CreditCard, RefreshCw } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { SubscriptionDetails } from "@/components/subscription-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { getInitials } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePayment, useUpdatePayment, useDeletePayment } from "@/hooks/usePayments";
import { useUpdateSubscription, useDeleteSubscription, useManualRefundSessions, useConsumeSession } from "@/hooks/useSubscriptions";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Payment } from "@/lib/api/payments";
import { CardSkeleton } from "@/components/skeletons";

// Type definitions
type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  credit: number;
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

// Payment form schema
const paymentFormSchema = z.object({
  subscription_id: z.number(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_type: z.enum(['credit', 'cash', 'card', 'bank_transfer', 'check', 'other']),
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded']).optional(),
  payment_date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  payment_reference: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

// Subscription form schema
const subscriptionFormSchema = z.object({
  member_id: z.number().min(1, "Member is required"),
  plan_id: z.number().min(1, "Plan is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["active", "inactive", "expired", "cancelled"]),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminSubscriptionDetails() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isDeletePaymentModalOpen, setIsDeletePaymentModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<number | null>(null);
  const [isConsumeSessionModalOpen, setIsConsumeSessionModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const { toast } = useToast();

  // Queries
  const { data: subscriptions, isLoading: loadingSubscriptions } = useSubscriptions();
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();

  // Forms
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      subscription_id: parseInt(subscriptionId),
      amount: 0,
      payment_type: 'cash',
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: '',
    },
  });

  const subscriptionForm = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      member_id: 0,
      plan_id: 0,
      start_date: '',
      end_date: '',
      status: 'active',
      notes: '',
    },
  });

  // Mutations
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const updateSubscriptionMutation = useUpdateSubscription();
  const deleteSubscriptionMutation = useDeleteSubscription();
  const manualRefundMutation = useManualRefundSessions();
  const consumeSessionMutation = useConsumeSession();

  // Map members from snake_case to camelCase for UI
  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || '',
        lastName: m.lastName || m.last_name || '',
        email: m.email,
        status: m.member_status,
        member_status: m.member_status,
        credit: m.credit || 0,
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
        member: mappedMembers.find((m: any) => m.id === sub.member_id) || null,
        plan: plans.find((p: any) => p.id === sub.plan_id) || null,
      }))
    : [];

  // Find the current subscription
  const subscription = mappedSubscriptions.find((sub: Subscription) => sub.id === parseInt(subscriptionId));

  // Get payments for this subscription
  const getPaymentsForSubscription = (subscriptionId: number) => {
    return payments.filter(payment => payment.subscription_id === subscriptionId);
  };

  const subscriptionPayments = subscription ? getPaymentsForSubscription(subscription.id) : [];
  const totalPaid = subscriptionPayments
    .filter((p) => p.payment_status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const planPrice = Number(subscription?.plan?.price) || 0;
  const remainingAmount = Math.max(0, planPrice - totalPaid);
  const isFullyPaid = remainingAmount === 0;


  // Event handlers
  const openPaymentModal = (override?: { amount?: number; payment_type?: PaymentFormData['payment_type'] }) => {
    if (!subscription) return;
    
    const amountToUse = override?.amount ?? remainingAmount;
    
    paymentForm.reset({
      subscription_id: subscription.id,
      amount: amountToUse,
      payment_type: override?.payment_type ?? "cash",
      status: "paid",
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (data: PaymentFormData) => {
    const paymentPayload = {
      subscription_id: data.subscription_id,
      member_id: subscription?.member_id || '',
      amount: data.amount,
      payment_type: data.payment_type,
      status: data.status,
      payment_date: data.payment_date,
      payment_reference: data.payment_reference,
    };

    if (editingPayment) {
      updatePaymentMutation.mutate({
        paymentId: editingPayment.id,
        data: paymentPayload
      }, {
        onSuccess: () => {
          setIsPaymentModalOpen(false);
          setEditingPayment(null);
          paymentForm.reset();
        }
      });
    } else {
      createPaymentMutation.mutate(paymentPayload, {
        onSuccess: () => {
          setIsPaymentModalOpen(false);
          paymentForm.reset();
        }
      });
    }
  };

  const handleDeleteSubscription = () => {
    setSubscriptionToDelete(parseInt(subscriptionId));
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (subscriptionToDelete) {
      deleteSubscriptionMutation.mutate(subscriptionToDelete, {
        onSuccess: () => {
          router.push('/admin/subscriptions');
        }
      });
      setShowDeleteConfirm(false);
      setSubscriptionToDelete(null);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    paymentForm.reset({
      subscription_id: payment.subscription_id,
      amount: payment.amount,
      payment_type: (payment.payment_type as "cash" | "card" | "bank_transfer" | "check" | "other") || "cash",
      status: (payment.payment_status as "pending" | "paid" | "failed" | "cancelled") || "paid",
      payment_date: payment.payment_date.split('T')[0],
      payment_reference: payment.payment_reference || '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsDeletePaymentModalOpen(true);
  };

  const handleManualRefund = () => {
    if (subscription?.id) {
      manualRefundMutation.mutate({ subscriptionId: subscription.id, sessionsToRefund: 1 });
    }
  };

  const handleSubscriptionSubmit = (data: SubscriptionFormData) => {
    if (!subscription?.id) return;
    
    updateSubscriptionMutation.mutate({
      subscriptionId: subscription.id,
      data: {
        member_id: data.member_id,
        plan_id: data.plan_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        notes: data.notes,
      }
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        toast({
          title: "Success",
          description: "Subscription updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update subscription",
          variant: "destructive",
        });
      }
    });
  };

  const handleConsumeSession = () => {
    if (!subscription?.id || !selectedGroupId) return;
    
    consumeSessionMutation.mutate({
      subscriptionId: subscription.id,
      groupId: selectedGroupId
    }, {
      onSuccess: () => {
        setIsConsumeSessionModalOpen(false);
        setSelectedGroupId(null);
      }
    });
  };

  // Initialize subscription form when subscription data is available
  useEffect(() => {
    if (subscription) {
      subscriptionForm.reset({
        member_id: subscription.member_id || 0,
        plan_id: subscription.plan_id || 0,
        start_date: subscription.start_date ? subscription.start_date.split('T')[0] : '',
        end_date: subscription.end_date ? subscription.end_date.split('T')[0] : '',
        status: subscription.status || 'active',
        notes: subscription.notes || '',
      });
    }
  }, [subscription, subscriptionForm]);

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

  if (loadingSubscriptions || loadingMembers || loadingPlans || loadingPayments) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-muted rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <CardSkeleton showImage={false} lines={8} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Subscription Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">The subscription you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subscription Details</h1>
            
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleManualRefund}
            disabled={manualRefundMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {manualRefundMutation.isPending ? 'Refunding...' : 'Refund 1 Session'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsConsumeSessionModalOpen(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Consume 1 Session
          </Button>
          {!isFullyPaid && (
            <Button onClick={() => openPaymentModal()}>
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment
            </Button>
          )}
          <Button variant="destructive" onClick={handleDeleteSubscription}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>


      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <SubscriptionDetails 
            subscription={subscription as any} 
            payments={payments as any}
            showTabs={false}
            isAdmin={true}
            member={{
              firstName: subscription.member?.firstName,
              lastName: subscription.member?.lastName,
              email: subscription.member?.email
            }}
          />
        </TabsContent>
        
        <TabsContent value="payments">
          <Card className="shadow-none border-none bg-transparent">
            <CardHeader className="p-0 mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Payments</CardTitle>
              </div>
              {/* Payment summary row */}
              <div className="flex flex-wrap gap-4 items-center text-sm mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-semibold">{formatPrice(totalPaid)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Plan Price:</span>
                  <span className="font-semibold">{formatPrice(planPrice)}</span>
                </div>
                <Badge variant={isFullyPaid ? 'default' : remainingAmount > 0 ? 'secondary' : 'destructive'}>
                  {isFullyPaid ? 'Fully Paid' : remainingAmount > 0 ? 'Partially Paid' : 'Not Paid'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptionPayments.length === 0 ? (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">No payments recorded for this subscription.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {subscriptionPayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center md:justify-between bg-muted/30 shadow-sm gap-2">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                        <span className="font-semibold text-base text-primary">{formatPrice(payment.amount)}</span>
                        <Badge variant={payment.payment_status === 'paid' ? 'default' : payment.payment_status === 'pending' ? 'secondary' : 'destructive'} className="ml-2 text-xs capitalize">
                          {payment.payment_status}
                        </Badge>
                        <span className="text-muted-foreground ml-2">{payment.payment_type} • {formatDate(payment.payment_date)}</span>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            const member = subscription?.member;
            if (!member) return null;
            return (
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-700 font-semibold text-lg">Credit: {Number(member.credit) || 0} TND</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!subscription) return;
                    const useAmount = Math.min(Number(member.credit) || 0, remainingAmount);
                    openPaymentModal({ amount: useAmount, payment_type: 'credit' });
                  }}
                  disabled={!member.credit || Number(member.credit) <= 0 || !subscription}
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
                  name="payment_type"
                  control={paymentForm.control}
                  render={({ field }) => {
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

      {/* Subscription Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(handleSubscriptionSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="member_id"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={val => {
                          field.onChange(parseInt(val));
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
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
                  name="plan_id"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={val => {
                          field.onChange(parseInt(val));
                          field.onBlur();
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mappedPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - {formatPrice(plan.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Controller
                  name="start_date"
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
                  name="end_date"
                  control={subscriptionForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
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
                          <SelectItem value="inactive">Inactive</SelectItem>
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

      {/* Consume Session Modal */}
      <Dialog open={isConsumeSessionModalOpen} onOpenChange={setIsConsumeSessionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Consume Session</DialogTitle>
            <DialogDescription>
              Select which group to consume a session from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {subscription?.subscription_group_sessions?.length > 0 ? (
              <div className="space-y-2">
                {subscription.subscription_group_sessions.map((groupSession: any) => (
                  <div 
                    key={groupSession.group_id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroupId === groupSession.group_id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedGroupId(groupSession.group_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{groupSession.group?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {groupSession.sessions_remaining} sessions remaining
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                          style={{ 
                            backgroundColor: selectedGroupId === groupSession.group_id ? 'var(--primary)' : 'transparent',
                            borderColor: groupSession.group?.color || 'var(--border)'
                          }}
                        >
                          {selectedGroupId === groupSession.group_id && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No group sessions available for this subscription
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsConsumeSessionModalOpen(false);
                setSelectedGroupId(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConsumeSession}
              disabled={!selectedGroupId || consumeSessionMutation.isPending}
            >
              {consumeSessionMutation.isPending ? 'Consuming...' : 'Consume Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Subscription"
        description="Are you sure you want to delete this subscription? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isPending={deleteSubscriptionMutation.isPending}
      />
    </div>
  );
}
