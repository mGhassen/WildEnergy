"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, Filter, Calendar, TrendingUp, CreditCard, Edit, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { apiRequest } from "@/lib/queryClient";

type Payment = {
  id: number;
  subscription_id: number;
  user_id: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  transaction_id?: string;
  payment_date?: string;
  due_date?: string;
  discount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  member?: {
    firstName: string;
    lastName: string;
    email: string;
    credit?: number; // Added credit field
  };
  subscription?: {
    plan?: {
      name: string;
      price: number;
    };
  };
};

type FilterState = {
  searchTerm: string;
  selectedMember: string;
  selectedPlan: string;
  selectedPaymentType: string;
  selectedStatus: string;
  dateFrom: string;
  dateTo: string;
};

export default function AdminPayments() {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    selectedMember: "all",
    selectedPlan: "all",
    selectedPaymentType: "all",
    selectedStatus: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Edit and delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: "",
    payment_type: "cash",
    payment_status: "paid",
    payment_date: "",
    transaction_id: "",
    notes: "",
  });

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    queryFn: () => apiRequest("GET", "/api/payments"),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members"],
    queryFn: () => apiRequest("GET", "/api/members"),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["/api/subscriptions"],
    queryFn: () => apiRequest("GET", "/api/subscriptions"),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/plans"],
    queryFn: () => apiRequest("GET", "/api/plans"),
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutations
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/payments/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditModalOpen(false);
      setEditingPayment(null);
      toast({ title: "Payment updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating payment",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsDeleteModalOpen(false);
      setPaymentToDelete(null);
      toast({ title: "Payment deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting payment",
        description: error.message,
        variant: "destructive"
      });
    },
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
        sessionsIncluded: plan.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) ?? plan.sessionsIncluded ?? 0,
        duration: plan.duration_days ?? plan.duration ?? 0,
      }))
    : [];

  // Map payments to include member and subscription/plan data
  const mappedPayments = Array.isArray(payments) && Array.isArray(mappedMembers) && Array.isArray(subscriptions) && Array.isArray(mappedPlans)
    ? payments.map((payment: any) => {
        const member = mappedMembers.find((m: any) => m.id === payment.user_id) || null;
        const subscription = subscriptions.find((s: any) => s.id === payment.subscription_id) || null;
        const plan = subscription ? mappedPlans.find((p: any) => p.id === subscription.plan_id) || null : null;
        
        return {
          ...payment,
          member,
          subscription: subscription ? { ...subscription, plan } : null,
        };
      })
    : [];

  // Filter payments based on all criteria
  const filteredPayments = useMemo(() => {
    return mappedPayments.filter((payment) => {
      // Search term filter
      const searchMatch = !filters.searchTerm || 
        `${payment.member?.firstName || ''} ${payment.member?.lastName || ''} ${payment.subscription?.plan?.name || ''} ${payment.payment_type || ''}`
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase());

      // Member filter
      const memberMatch = filters.selectedMember === "all" || payment.user_id === filters.selectedMember;

      // Plan filter
      const planMatch = filters.selectedPlan === "all" || payment.subscription?.plan?.id === parseInt(filters.selectedPlan);

      // Payment type filter
      const paymentTypeMatch = filters.selectedPaymentType === "all" || payment.payment_type === filters.selectedPaymentType;

      // Status filter
      const statusMatch = filters.selectedStatus === "all" || payment.payment_status === filters.selectedStatus;

      // Date range filter
      let dateMatch = true;
      if (filters.dateFrom && payment.payment_date) {
        dateMatch = dateMatch && payment.payment_date >= filters.dateFrom;
      }
      if (filters.dateTo && payment.payment_date) {
        dateMatch = dateMatch && payment.payment_date <= filters.dateTo;
      }

      return searchMatch && memberMatch && planMatch && paymentTypeMatch && statusMatch && dateMatch;
    });
  }, [mappedPayments, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayPayments = filteredPayments.filter(p => 
      p.payment_date && new Date(p.payment_date) >= today
    );
    const weekPayments = filteredPayments.filter(p => 
      p.payment_date && new Date(p.payment_date) >= weekStart
    );
    const monthPayments = filteredPayments.filter(p => 
      p.payment_date && new Date(p.payment_date) >= monthStart
    );

    const completedPayments = filteredPayments.filter(p => p.payment_status === 'paid');

    // Sum of all credits on hold
    const totalCredits = mappedMembers.reduce((sum, m) => sum + (m.credit > 0 ? m.credit : 0), 0);

    return {
      total: completedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      today: todayPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
      thisWeek: weekPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
      thisMonth: monthPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
      totalPayments: filteredPayments.length,
      completedPayments: completedPayments.length,
      uniqueMembers: new Set(filteredPayments.map(p => p.user_id)).size,
      totalCredits,
    };
  }, [filteredPayments, mappedMembers]);

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price));
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'refunded':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅ Paid';
      case 'pending':
        return '⏳ Pending';
      case 'failed':
        return '❌ Failed';
      case 'refunded':
        return '↩️ Refunded';
      case 'cancelled':
        return '🚫 Cancelled';
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      selectedMember: "all",
      selectedPlan: "all",
      selectedPaymentType: "all",
      selectedStatus: "all",
      dateFrom: "",
      dateTo: "",
    });
  };

  // Edit and delete handlers
  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditFormData({
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      payment_status: payment.payment_status,
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : "",
      transaction_id: payment.transaction_id || "",
      notes: payment.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsDeleteModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingPayment) return;
    
    const updateData = {
      id: editingPayment.id,
      subscription_id: editingPayment.subscription_id,
      user_id: editingPayment.user_id,
      amount: parseFloat(editFormData.amount),
      payment_type: editFormData.payment_type,
      payment_status: editFormData.payment_status,
      payment_date: editFormData.payment_date,
      transaction_id: editFormData.transaction_id || null,
      notes: editFormData.notes || null,
    };
    
    updatePaymentMutation.mutate(updateData);
  };

  const handleDeleteConfirm = () => {
    if (!paymentToDelete) return;
    deletePaymentMutation.mutate(paymentToDelete.id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payments</h1>
          <p className="text-muted-foreground">Manage all payment transactions</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex flex-col items-start">
              <span>{formatPrice(stats.total)}</span>
              {stats.totalCredits > 0 && (
                <span className="text-orange-600 text-base font-semibold mt-1">+{stats.totalCredits} credits</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedPayments} completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.thisWeek)}</div>
            <p className="text-xs text-muted-foreground">
              Weekly revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.today)}</div>
            <p className="text-xs text-muted-foreground">
              Daily revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter payments by various criteria
              </CardDescription>
            </div>
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Member Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Member</label>
              <Select value={filters.selectedMember} onValueChange={(value) => setFilters(prev => ({ ...prev, selectedMember: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {mappedMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <Select value={filters.selectedPlan} onValueChange={(value) => setFilters(prev => ({ ...prev, selectedPlan: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {mappedPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <Select value={filters.selectedPaymentType} onValueChange={(value) => setFilters(prev => ({ ...prev, selectedPaymentType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.selectedStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, selectedStatus: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="space-y-1">
                <Input
                  type="date"
                  placeholder="From"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits On Hold for Members */}
      {mappedMembers.filter(m => m.credit > 0).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Credits On Hold</CardTitle>
            <CardDescription>Members who currently have credits</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedMembers.filter(m => m.credit > 0).map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{member.firstName} {member.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-orange-700 border-orange-300 bg-orange-50">
                        {member.credit} TND
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            {filteredPayments.length} of {mappedPayments.length} payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {payment.member ? getInitials(payment.member.firstName, payment.member.lastName) : "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {payment.member?.firstName} {payment.member?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{payment.member?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{payment.subscription?.plan?.name || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span className="font-medium">{formatPrice(payment.amount)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.payment_type === 'credit' ? (
                      <Badge style={{ backgroundColor: '#FFA500', color: '#fff' }}>
                        Credit
                      </Badge>
                    ) : (
                      payment.payment_type || '-'
                    )}
                  </TableCell>
                  <TableCell>{payment.payment_date ? formatDate(payment.payment_date) : '-'}</TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(payment.payment_status)}>
                      {getPaymentStatusText(payment.payment_status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPayment(payment)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePayment(payment)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Payment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update payment details for {editingPayment?.member?.firstName} {editingPayment?.member?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editFormData.amount}
                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_type" className="text-right">
                Type
              </Label>
              <Select
                value={editFormData.payment_type}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, payment_type: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_status" className="text-right">
                Status
              </Label>
              <Select
                value={editFormData.payment_status}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, payment_status: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_date" className="text-right">
                Date
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={editFormData.payment_date}
                onChange={(e) => setEditFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction_id" className="text-right">
                Transaction ID
              </Label>
              <Input
                id="transaction_id"
                value={editFormData.transaction_id}
                onChange={(e) => setEditFormData(prev => ({ ...prev, transaction_id: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={updatePaymentMutation.isPending}
            >
              {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">
                {paymentToDelete?.member?.firstName} {paymentToDelete?.member?.lastName}
              </p>
              <p className="text-sm text-gray-600">
                Amount: {formatPrice(paymentToDelete?.amount || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Date: {paymentToDelete?.payment_date ? formatDate(paymentToDelete.payment_date) : 'N/A'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 