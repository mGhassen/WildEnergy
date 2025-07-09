import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, Filter, Calendar, TrendingUp, Users, CreditCard } from "lucide-react";
import { getInitials, formatDate } from "@/lib/auth";
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

    const completedPayments = filteredPayments.filter(p => p.payment_status === 'completed');

    return {
      total: completedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      today: todayPayments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
      thisWeek: weekPayments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
      thisMonth: monthPayments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
      totalPayments: filteredPayments.length,
      completedPayments: completedPayments.length,
      uniqueMembers: new Set(filteredPayments.map(p => p.user_id)).size,
    };
  }, [filteredPayments]);

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
            <div className="text-2xl font-bold">{formatPrice(stats.total)}</div>
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
                  <TableCell>{payment.payment_type || '-'}</TableCell>
                  <TableCell>{payment.payment_date ? formatDate(payment.payment_date) : '-'}</TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(payment.payment_status)}>
                      {getPaymentStatusText(payment.payment_status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 