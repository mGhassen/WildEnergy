"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Payment } from "@/lib/api/payments";
import { Plus, Search, Edit, Trash2, Eye, CreditCard, MoreVertical, RefreshCw, Filter, SortAsc, SortDesc, Calendar, DollarSign, Users, TrendingUp, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

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
  payment_type: z.enum(['credit', 'cash', 'card', 'bank_transfer', 'check', 'other']),
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded']).optional(),
  payment_date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  payment_reference: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;
type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function AdminSubscriptions() {
  const router = useRouter();
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [selectedSubscriptionForPayment, setSelectedSubscriptionForPayment] = useState<Subscription | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isDeletePaymentModalOpen, setIsDeletePaymentModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<number | null>(null);
  
  // Enhanced filtering and sorting state
  const [sortField, setSortField] = useState<keyof Subscription | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<number[]>([]);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showFilters, setShowFilters] = useState(false);
  
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
        email: m.email || m.account_email || '',
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
  const mappedSubscriptions = Array.isArray(subscriptions)
    ? subscriptions.map((sub: any) => ({
        ...sub,
        member: sub.member ? {
          ...sub.member,
          firstName: sub.member.first_name || '',
          lastName: sub.member.last_name || '',
          email: sub.member.account_email || '',
          status: sub.member.member_status || 'active',
          credit: sub.member.credit || 0,
        } : null,
        plan: sub.plan || null,
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
      payment_type: "cash",
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
      .filter(p => p.payment_status === 'paid')
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

  // 1. Fix openPaymentModal to accept an optional override for payment_type and amount
  const openPaymentModal = (subscription: Subscription, override?: { amount?: number; payment_type?: PaymentFormData['payment_type'] }) => {
    setSelectedSubscriptionForPayment(subscription);
    
    // Calculate remaining amount if not overridden
    const remainingAmount = override?.amount ?? getRemainingAmount(subscription);
    
    paymentForm.reset({
      subscription_id: subscription.id,
      amount: remainingAmount,
      payment_type: override?.payment_type ?? "cash",
      status: "paid",
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: "",
    });
    setIsPaymentModalOpen(true);
  };

  const navigateToSubscriptionDetails = (subscription: Subscription) => {
    router.push(`/admin/subscriptions/${subscription.id}`);
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

  // 3. In handlePaymentSubmit, use data.payment_type directly
  const handlePaymentSubmit = (data: PaymentFormData) => {
    console.log('Payment form data:', data);
    const paymentPayload = {
      subscription_id: data.subscription_id,
      member_id: selectedSubscriptionForPayment?.member_id || '',
      amount: data.amount,
      payment_type: data.payment_type,
      status: data.status,
      payment_date: data.payment_date,
      payment_reference: data.payment_reference,
    };
    console.log('Payment payload:', paymentPayload);
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

  const handleDeleteSubscription = (id: number) => {
    setSubscriptionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (subscriptionToDelete) {
      deleteSubscriptionMutation.mutate(subscriptionToDelete);
      setShowDeleteConfirm(false);
      setSubscriptionToDelete(null);
    }
  };

  function handleEditPayment(payment: Payment) {
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
  }

  function handleDeletePayment(payment: Payment) {
    setPaymentToDelete(payment);
    setIsDeletePaymentModalOpen(true);
  }

  // Get payments for a subscription
  const getPaymentsForSubscription = (subscriptionId: number) => {
    return payments.filter(payment => payment.subscription_id === subscriptionId);
  };

  // Enhanced filtering and sorting logic
  const filteredAndSortedSubscriptions = (() => {
    let filtered = mappedSubscriptions.filter((subscription) => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        subscription.member?.firstName?.toLowerCase().includes(searchLower) ||
        subscription.member?.lastName?.toLowerCase().includes(searchLower) ||
        subscription.member?.email?.toLowerCase().includes(searchLower) ||
        subscription.plan?.name?.toLowerCase().includes(searchLower) ||
        subscription.status?.toLowerCase().includes(searchLower)
      );

      // Status filter
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(subscription.status);

      // Plan filter
      const matchesPlan = planFilter.length === 0 || planFilter.includes(subscription.plan_id);

      // Payment status filter
      const subscriptionPayments = getPaymentsForSubscription(subscription.id);
      const totalPaid = subscriptionPayments
        .filter((p) => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const planPrice = subscription.plan?.price || 0;
      let paymentStatus = 'not_paid';
      if (totalPaid >= planPrice && planPrice > 0) {
        paymentStatus = 'fully_paid';
      } else if (totalPaid > 0 && totalPaid < planPrice) {
        paymentStatus = 'partially_paid';
      }
      const matchesPaymentStatus = paymentStatusFilter.length === 0 || paymentStatusFilter.includes(paymentStatus);

      // Date range filter
      const subscriptionDate = new Date(subscription.start_date);
      const matchesDateRange = !dateRangeFilter || !dateRangeFilter.from || !dateRangeFilter.to || 
        (subscriptionDate >= dateRangeFilter.from && subscriptionDate <= dateRangeFilter.to);

      return matchesSearch && matchesStatus && matchesPlan && matchesPaymentStatus && matchesDateRange;
    });

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        // Handle nested properties
        if (sortField === 'member') {
          aValue = `${a.member?.firstName || ''} ${a.member?.lastName || ''}`.trim();
          bValue = `${b.member?.firstName || ''} ${b.member?.lastName || ''}`.trim();
        } else if (sortField === 'plan') {
          aValue = a.plan?.name || '';
          bValue = b.plan?.name || '';
        }

        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  })();

  // Analytics data
  const analytics = (() => {
    const total = mappedSubscriptions.length;
    const active = mappedSubscriptions.filter(s => s.status === 'active').length;
    const expired = mappedSubscriptions.filter(s => s.status === 'expired').length;
    const pending = mappedSubscriptions.filter(s => s.status === 'pending').length;
    const cancelled = mappedSubscriptions.filter(s => s.status === 'cancelled').length;
    
    const totalRevenue = mappedSubscriptions.reduce((sum, sub) => {
      const subscriptionPayments = getPaymentsForSubscription(sub.id);
      return sum + subscriptionPayments
        .filter(p => p.payment_status === 'paid')
        .reduce((paymentSum, p) => paymentSum + (p.amount || 0), 0);
    }, 0);

    const totalPotentialRevenue = mappedSubscriptions.reduce((sum, sub) => sum + (sub.plan?.price || 0), 0);

    return {
      total,
      active,
      expired,
      pending,
      cancelled,
      totalRevenue,
      totalPotentialRevenue,
      collectionRate: totalPotentialRevenue > 0 ? (totalRevenue / totalPotentialRevenue) * 100 : 0
    };
  })();

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
        <div className="flex items-center gap-2">
          <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateSubscriptionModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{analytics.active}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{analytics.collectionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>      

      {/* Search and Filters */}
      <div className="space-y-4">
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
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values({statusFilter, paymentStatusFilter, planFilter, dateRangeFilter}).some(f => 
              Array.isArray(f) ? f.length > 0 : f && (f.from || f.to)
            ) && (
              <Badge variant="secondary" className="ml-1">
                {[statusFilter, paymentStatusFilter, planFilter].filter(f => f.length > 0).length + 
                 (dateRangeFilter && (dateRangeFilter.from || dateRangeFilter.to) ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <div className="space-y-2">
                    {['active', 'pending', 'expired', 'cancelled'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter([...statusFilter, status]);
                            } else {
                              setStatusFilter(statusFilter.filter(s => s !== status));
                            }
                          }}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm capitalize">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <div className="space-y-2">
                    {[
                      { value: 'fully_paid', label: 'Fully Paid' },
                      { value: 'partially_paid', label: 'Partially Paid' },
                      { value: 'not_paid', label: 'Not Paid' }
                    ].map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${value}`}
                          checked={paymentStatusFilter.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPaymentStatusFilter([...paymentStatusFilter, value]);
                            } else {
                              setPaymentStatusFilter(paymentStatusFilter.filter(p => p !== value));
                            }
                          }}
                        />
                        <label htmlFor={`payment-${value}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plans</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {mappedPlans.map((plan) => (
                      <div key={plan.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`plan-${plan.id}`}
                          checked={planFilter.includes(plan.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPlanFilter([...planFilter, plan.id]);
                            } else {
                              setPlanFilter(planFilter.filter(p => p !== plan.id));
                            }
                          }}
                        />
                        <label htmlFor={`plan-${plan.id}`} className="text-sm">
                          {plan.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRangeFilter?.from ? (
                            dateRangeFilter.to ? (
                              `${dateRangeFilter.from.toLocaleDateString()} - ${dateRangeFilter.to.toLocaleDateString()}`
                            ) : (
                              dateRangeFilter.from.toLocaleDateString()
                            )
                          ) : (
                            "Select date range"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={dateRangeFilter}
                          onSelect={(range) => setDateRangeFilter(range || undefined)}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>
                {filteredAndSortedSubscriptions.length} subscription{filteredAndSortedSubscriptions.length !== 1 ? 's' : ''} found
                {selectedSubscriptions.length > 0 && (
                  <span className="ml-2 text-primary">
                    ({selectedSubscriptions.length} selected)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedSubscriptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Bulk actions can be implemented here
                      toast({
                        title: "Bulk Action",
                        description: `${selectedSubscriptions.length} subscriptions selected`,
                      });
                    }}
                  >
                    Bulk Actions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubscriptions([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSubscriptions.length === filteredAndSortedSubscriptions.length && filteredAndSortedSubscriptions.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSubscriptions(filteredAndSortedSubscriptions.map(s => s.id));
                      } else {
                        setSelectedSubscriptions([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortField === 'member') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('member');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    Member
                    {sortField === 'member' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortField === 'plan') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('plan');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    Plan
                    {sortField === 'plan' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (sortField === 'start_date') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('start_date');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    {sortField === 'start_date' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Sessions Remaining</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSubscriptions.map((subscription) => (
                <TableRow
                  key={subscription.id}
                  className={cn(
                    "group cursor-pointer",
                    selectedSubscriptions.includes(subscription.id) && "bg-muted/50"
                  )}
                  onClick={e => {
                    // Prevent row click if clicking on actions menu or checkbox
                    if ((e.target as HTMLElement).closest('.actions-menu') || 
                        (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                    navigateToSubscriptionDetails(subscription);
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedSubscriptions.includes(subscription.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubscriptions([...selectedSubscriptions, subscription.id]);
                        } else {
                          setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== subscription.id));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subscription.member?.member_id) {
                            router.push(`/admin/members/${subscription.member.member_id}`);
                          }
                        }}
                        className="text-left hover:text-primary transition-colors block"
                      >
                        <div className="font-medium">
                          {subscription.member?.firstName} {subscription.member?.lastName}
                        </div>
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subscription.plan?.id) {
                            router.push(`/admin/plans/${subscription.plan.id}`);
                          }
                        }}
                        className="text-left hover:text-primary transition-colors"
                      >
                        <div className="font-medium">{subscription.plan?.name}</div>
                      </button>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(subscription.plan?.price || 0)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">From:</span> {formatDate(subscription.start_date)}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">To:</span> {formatDate(subscription.end_date)}
                      </div>
                      {(() => {
                        const startDate = new Date(subscription.start_date);
                        const endDate = new Date(subscription.end_date);
                        const today = new Date();
                        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const daysElapsed = totalDays - daysRemaining;
                        const progressPercentage = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));
                        
                        return (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className={cn(
                                  "h-1.5 rounded-full transition-all",
                                  daysRemaining > 30 ? "bg-green-500" : 
                                  daysRemaining > 7 ? "bg-yellow-500" : 
                                  daysRemaining > 0 ? "bg-orange-500" : "bg-red-500"
                                )}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium text-lg">
                        {subscription.subscription_group_sessions?.reduce((sum: number, group: any) => sum + (group.sessions_remaining || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of {subscription.subscription_group_sessions?.reduce((sum: number, group: any) => sum + (group.total_sessions || 0), 0) || 0} total
                      </div>
                    </div>
                  </TableCell>
                  {/* Payment Status Badge */}
                  <TableCell>
                    {
                      (() => {
                        const subscriptionPayments = getPaymentsForSubscription(subscription.id);
                        const totalPaid = subscriptionPayments
                          .filter((p) => p.payment_status === 'paid')
                          .reduce((sum, p) => sum + (p.amount || 0), 0);
                        const planPrice = subscription.plan?.price || 0;
                        const remainingAmount = Math.max(0, planPrice - totalPaid);
                        
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
                          <div className="space-y-1">
                            <Badge variant={color}>{status}</Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(totalPaid)} / {formatCurrency(planPrice)}
                            </div>
                            {remainingAmount > 0 && (
                              <div className="text-xs text-destructive">
                                {formatCurrency(remainingAmount)} remaining
                              </div>
                            )}
                          </div>
                        );
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
                              navigateToSubscriptionDetails(subscription);
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
                              .filter((p) => p.payment_status === 'paid')
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedSubscriptions.map((subscription) => {
                const subscriptionPayments = getPaymentsForSubscription(subscription.id);
                const totalPaid = subscriptionPayments
                  .filter((p) => p.payment_status === 'paid')
                  .reduce((sum, p) => sum + (p.amount || 0), 0);
                const planPrice = subscription.plan?.price || 0;
                const remainingAmount = Math.max(0, planPrice - totalPaid);
                const startDate = new Date(subscription.start_date);
                const endDate = new Date(subscription.end_date);
                const today = new Date();
                const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <Card 
                    key={subscription.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedSubscriptions.includes(subscription.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => navigateToSubscriptionDetails(subscription)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedSubscriptions.includes(subscription.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSubscriptions([...selectedSubscriptions, subscription.id]);
                              } else {
                                setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== subscription.id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {getInitials(subscription.member?.firstName || '', subscription.member?.lastName || '')}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(subscription.status)}>
                          {getStatusText(subscription.status)}
                        </Badge>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subscription.member?.member_id) {
                            router.push(`/admin/members/${subscription.member.member_id}`);
                          }
                        }}
                        className="text-left hover:text-primary transition-colors"
                      >
                        <h3 className="font-semibold text-lg">
                          {subscription.member?.firstName} {subscription.member?.lastName}
                        </h3>
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (subscription.plan?.id) {
                              router.push(`/admin/plans/${subscription.plan.id}`);
                            }
                          }}
                          className="text-left hover:text-primary transition-colors"
                        >
                          <h4 className="font-medium">{subscription.plan?.name}</h4>
                        </button>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(subscription.plan?.price || 0)}
                        </p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                              </span>
                              <div className="flex-1 bg-muted rounded-full h-1.5">
                                <div 
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    daysRemaining > 30 ? "bg-green-500" : 
                                    daysRemaining > 7 ? "bg-yellow-500" : 
                                    daysRemaining > 0 ? "bg-orange-500" : "bg-red-500"
                                  )}
                                  style={{ 
                                    width: `${Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100))}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sessions</span>
                          <span className="font-medium">
                            {subscription.subscription_group_sessions?.reduce((sum: number, group: any) => sum + (group.sessions_remaining || 0), 0) || 0} remaining
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment</span>
                          <span className="font-medium">
                            {formatCurrency(totalPaid)} / {formatCurrency(planPrice)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Status</span>
                          <Badge variant={
                            totalPaid >= planPrice && planPrice > 0 ? 'default' : 
                            totalPaid > 0 ? 'secondary' : 'destructive'
                          }>
                            {totalPaid >= planPrice && planPrice > 0 ? 'Fully Paid' : 
                             totalPaid > 0 ? 'Partially Paid' : 'Not Paid'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
                    if (!selectedSubscriptionForPayment) return;
                    const remainingAmount = getRemainingAmount(selectedSubscriptionForPayment);
                    const useAmount = Math.min(Number(member.credit) || 0, remainingAmount);
                    openPaymentModal(selectedSubscriptionForPayment, { amount: useAmount, payment_type: 'credit' });
                  }}
                  disabled={!member.credit || Number(member.credit) <= 0 || !selectedSubscriptionForPayment}
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
