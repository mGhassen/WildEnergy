"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions, useManualRefundSessions } from "@/hooks/useSubscriptions";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { usePayments } from "@/hooks/usePayments";
import { TableSkeleton } from "@/components/skeletons";
import { Plus, Search, Edit, Trash2, Eye, CreditCard, MoreVertical, RefreshCw, Filter, SortAsc, SortDesc, Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/auth";
import { formatSubscriptionPeriod, subscriptionDurationDays, subscriptionDaysRemaining } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  credit: number;
  member_id?: string;
  member_status?: string;
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

export default function AdminSubscriptions() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const [sortField, setSortField] = useState<keyof Subscription | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<number[]>([]);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();

  const { data: subscriptions } = useSubscriptions();
  const { data: members = [] } = useMembers();
  const { data: plans = [] } = usePlans();
  const { data: payments = [] } = usePayments();

  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || "",
        lastName: m.lastName || m.last_name || "",
        email: m.email || m.account_email || "",
        status: m.member_status,
        member_status: m.member_status,
        credit: m.credit || 0,
      }))
    : [];

  const mappedPlans = Array.isArray(plans)
    ? plans.map((plan: any) => ({
        ...plan,
        sessionsIncluded:
          plan.plan_groups?.reduce(
            (sum: number, group: any) => sum + (group.session_count || 0),
            0,
          ) ?? 0,
        duration: plan.duration_days ?? plan.duration ?? 0,
        isActive: plan.is_active ?? plan.isActive ?? true,
      }))
    : [];

  const mappedSubscriptions = Array.isArray(subscriptions)
    ? subscriptions.map((sub: any) => ({
        ...sub,
        member: sub.member
          ? {
              ...sub.member,
              firstName: sub.member.first_name || "",
              lastName: sub.member.last_name || "",
              email: sub.member.account_email || "",
              status: sub.member.member_status || "active",
              credit: sub.member.credit || 0,
            }
          : null,
        plan: sub.plan || null,
      }))
    : [];

  const getPaymentsForSubscription = (subscriptionId: number) => {
    return payments.filter((payment) => payment.subscription_id === subscriptionId);
  };

  const navigateToSubscriptionDetails = (subscription: Subscription) => {
    router.push(`/admin/subscriptions/${subscription.id}`);
  };

  const filteredAndSortedSubscriptions = (() => {
    let filtered = mappedSubscriptions.filter((subscription) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        subscription.member?.firstName?.toLowerCase().includes(searchLower) ||
        subscription.member?.lastName?.toLowerCase().includes(searchLower) ||
        subscription.member?.email?.toLowerCase().includes(searchLower) ||
        subscription.plan?.name?.toLowerCase().includes(searchLower) ||
        subscription.status?.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(subscription.status);

      const matchesPlan =
        planFilter.length === 0 || planFilter.includes(subscription.plan_id);

      const subscriptionPayments = getPaymentsForSubscription(subscription.id);
      const totalPaid = subscriptionPayments
        .filter((p) => p.payment_status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const planPrice = subscription.plan?.price || 0;
      let paymentStatus = "not_paid";
      if (totalPaid >= planPrice && planPrice > 0) {
        paymentStatus = "fully_paid";
      } else if (totalPaid > 0 && totalPaid < planPrice) {
        paymentStatus = "partially_paid";
      }
      const matchesPaymentStatus =
        paymentStatusFilter.length === 0 ||
        paymentStatusFilter.includes(paymentStatus);

      const subscriptionDate = new Date(subscription.start_date);
      const matchesDateRange =
        !dateRangeFilter ||
        !dateRangeFilter.from ||
        !dateRangeFilter.to ||
        (subscriptionDate >= dateRangeFilter.from &&
          subscriptionDate <= dateRangeFilter.to);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlan &&
        matchesPaymentStatus &&
        matchesDateRange
      );
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (sortField === "member") {
          aValue = `${a.member?.firstName || ""} ${a.member?.lastName || ""}`.trim();
          bValue = `${b.member?.firstName || ""} ${b.member?.lastName || ""}`.trim();
        } else if (sortField === "plan") {
          aValue = a.plan?.name || "";
          bValue = b.plan?.name || "";
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  })();

  const analytics = (() => {
    const total = mappedSubscriptions.length;
    const active = mappedSubscriptions.filter((s) => s.status === "active").length;
    const expired = mappedSubscriptions.filter((s) => s.status === "expired").length;
    const pending = mappedSubscriptions.filter((s) => s.status === "pending").length;
    const cancelled = mappedSubscriptions.filter((s) => s.status === "cancelled").length;

    const totalRevenue = mappedSubscriptions.reduce((sum, sub) => {
      const subscriptionPayments = getPaymentsForSubscription(sub.id);
      return (
        sum +
        subscriptionPayments
          .filter((p) => p.payment_status === "paid")
          .reduce((paymentSum, p) => paymentSum + (p.amount || 0), 0)
      );
    }, 0);

    const totalPotentialRevenue = mappedSubscriptions.reduce(
      (sum, sub) => sum + (sub.plan?.price || 0),
      0,
    );

    return {
      total,
      active,
      expired,
      pending,
      cancelled,
      totalRevenue,
      totalPotentialRevenue,
      collectionRate:
        totalPotentialRevenue > 0
          ? (totalRevenue / totalPotentialRevenue) * 100
          : 0,
    };
  })();

  const formatPrice = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "expired":
        return "destructive";
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending";
      case "expired":
        return "Expired";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const manualRefundMutation = useManualRefundSessions();

  const handleManualRefund = (subscription: Subscription) => {
    if (subscription.id) {
      manualRefundMutation.mutate({
        subscriptionId: subscription.id,
        sessionsToRefund: 1,
      });
    }
  };

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
          <Button onClick={() => router.push("/admin/subscriptions/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Subscription
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Subscriptions
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Collection Rate
                </p>
                <p className="text-2xl font-bold">
                  {analytics.collectionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

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
            {Object.values({
              statusFilter,
              paymentStatusFilter,
              planFilter,
              dateRangeFilter,
            }).some((f) => (Array.isArray(f) ? f.length > 0 : f && (f.from || f.to))) && (
              <Badge variant="secondary" className="ml-1">
                {[statusFilter, paymentStatusFilter, planFilter].filter(
                  (f) => f.length > 0,
                ).length +
                  (dateRangeFilter && (dateRangeFilter.from || dateRangeFilter.to)
                    ? 1
                    : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <div className="space-y-2">
                    {["active", "pending", "expired", "cancelled"].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter([...statusFilter, status]);
                            } else {
                              setStatusFilter(statusFilter.filter((s) => s !== status));
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <div className="space-y-2">
                    {[
                      { value: "fully_paid", label: "Fully Paid" },
                      { value: "partially_paid", label: "Partially Paid" },
                      { value: "not_paid", label: "Not Paid" },
                    ].map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${value}`}
                          checked={paymentStatusFilter.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPaymentStatusFilter([...paymentStatusFilter, value]);
                            } else {
                              setPaymentStatusFilter(
                                paymentStatusFilter.filter((p) => p !== value),
                              );
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
                              setPlanFilter(planFilter.filter((p) => p !== plan.id));
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>
                {filteredAndSortedSubscriptions.length} subscription
                {filteredAndSortedSubscriptions.length !== 1 ? "s" : ""} found
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
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredAndSortedSubscriptions.length === 0
                          ? false
                          : selectedSubscriptions.length ===
                              filteredAndSortedSubscriptions.length
                            ? true
                            : selectedSubscriptions.length > 0
                              ? "indeterminate"
                              : false
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubscriptions(
                            filteredAndSortedSubscriptions.map((s) => s.id),
                          );
                        } else {
                          setSelectedSubscriptions([]);
                        }
                      }}
                      aria-label="Select all subscriptions"
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortField === "member") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("member");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      Member
                      {sortField === "member" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortField === "plan") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("plan");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      Plan
                      {sortField === "plan" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortField === "start_date") {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("start_date");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      Duration
                      {sortField === "start_date" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        ))}
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
                      selectedSubscriptions.includes(subscription.id) && "bg-muted/50",
                    )}
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest(".actions-menu") ||
                        (e.target as HTMLElement).closest('[role="checkbox"]')
                      )
                        return;
                      navigateToSubscriptionDetails(subscription);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedSubscriptions.includes(subscription.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSubscriptions([
                              ...selectedSubscriptions,
                              subscription.id,
                            ]);
                          } else {
                            setSelectedSubscriptions(
                              selectedSubscriptions.filter(
                                (id) => id !== subscription.id,
                              ),
                            );
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
                              router.push(
                                `/admin/members/${subscription.member.member_id}`,
                              );
                            }
                          }}
                          className="text-left hover:text-primary transition-colors block"
                        >
                          <div className="font-medium">
                            {subscription.member?.firstName}{" "}
                            {subscription.member?.lastName}
                          </div>
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const planId =
                              subscription.plan?.id ?? subscription.plan_id;
                            if (planId) router.push(`/admin/plans/${planId}`);
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
                          <span className="text-muted-foreground">Period:</span>{" "}
                          {formatSubscriptionPeriod(
                            subscription.start_date,
                            subscription.end_date,
                          )}
                          {subscriptionDurationDays(
                            subscription.start_date,
                            subscription.end_date,
                          ) > 0
                            ? ` · ${subscriptionDurationDays(subscription.start_date, subscription.end_date)} days`
                            : ""}
                        </div>
                        {(() => {
                          const totalDays = subscriptionDurationDays(
                            subscription.start_date,
                            subscription.end_date,
                          );
                          const daysRemaining = subscriptionDaysRemaining(
                            subscription.end_date,
                          );
                          const daysElapsed = Math.max(0, totalDays - daysRemaining);
                          const progressPercentage =
                            totalDays > 0
                              ? Math.max(
                                  0,
                                  Math.min(100, (daysElapsed / totalDays) * 100),
                                )
                              : 0;

                          return (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {daysRemaining > 0
                                  ? `${daysRemaining} days left`
                                  : "Expired"}
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    daysRemaining > 30
                                      ? "bg-green-500"
                                      : daysRemaining > 7
                                        ? "bg-yellow-500"
                                        : daysRemaining > 0
                                          ? "bg-orange-500"
                                          : "bg-red-500",
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
                          {subscription.subscription_group_sessions?.reduce(
                            (sum: number, group: any) =>
                              sum + (group.sessions_remaining || 0),
                            0,
                          ) || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of{" "}
                          {subscription.subscription_group_sessions?.reduce(
                            (sum: number, group: any) =>
                              sum + (group.total_sessions || 0),
                            0,
                          ) || 0}{" "}
                          total
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const subscriptionPayments = getPaymentsForSubscription(
                          subscription.id,
                        );
                        const totalPaid = subscriptionPayments
                          .filter((p) => p.payment_status === "paid")
                          .reduce((sum, p) => sum + (p.amount || 0), 0);
                        const planPrice = subscription.plan?.price || 0;
                        const remainingAmount = Math.max(0, planPrice - totalPaid);

                        let status = "Not Paid";
                        let color: "default" | "destructive" | "secondary" | "outline" =
                          "destructive";
                        if (totalPaid >= planPrice && planPrice > 0) {
                          status = "Fully Paid";
                          color = "default";
                        } else if (totalPaid > 0 && totalPaid < planPrice) {
                          status = "Partially Paid";
                          color = "secondary";
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
                      })()}
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
                                router.push(
                                  `/admin/subscriptions/${subscription.id}/edit`,
                                );
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {(() => {
                              const subscriptionPayments = getPaymentsForSubscription(
                                subscription.id,
                              );
                              const totalPaid = subscriptionPayments
                                .filter((p) => p.payment_status === "paid")
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
                                    router.push(
                                      `/admin/subscriptions/${subscription.id}/payments/new`,
                                    );
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
                              {manualRefundMutation.isPending
                                ? "Refunding..."
                                : "Refund 1 Session"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/admin/subscriptions/${subscription.id}/delete`,
                                );
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
                const subscriptionPayments = getPaymentsForSubscription(
                  subscription.id,
                );
                const totalPaid = subscriptionPayments
                  .filter((p) => p.payment_status === "paid")
                  .reduce((sum, p) => sum + (p.amount || 0), 0);
                const planPrice = subscription.plan?.price || 0;
                const totalDays = subscriptionDurationDays(
                  subscription.start_date,
                  subscription.end_date,
                );
                const daysRemaining = subscriptionDaysRemaining(subscription.end_date);

                return (
                  <Card
                    key={subscription.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedSubscriptions.includes(subscription.id) &&
                        "ring-2 ring-primary",
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
                                setSelectedSubscriptions([
                                  ...selectedSubscriptions,
                                  subscription.id,
                                ]);
                              } else {
                                setSelectedSubscriptions(
                                  selectedSubscriptions.filter(
                                    (id) => id !== subscription.id,
                                  ),
                                );
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {getInitials(
                              subscription.member?.firstName || "",
                              subscription.member?.lastName || "",
                            )}
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
                            router.push(
                              `/admin/members/${subscription.member.member_id}`,
                            );
                          }
                        }}
                        className="text-left hover:text-primary transition-colors"
                      >
                        <h3 className="font-semibold text-lg">
                          {subscription.member?.firstName}{" "}
                          {subscription.member?.lastName}
                        </h3>
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const planId =
                              subscription.plan?.id ?? subscription.plan_id;
                            if (planId) router.push(`/admin/plans/${planId}`);
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
                              {formatSubscriptionPeriod(
                                subscription.start_date,
                                subscription.end_date,
                              )}
                              {totalDays > 0 ? ` · ${totalDays} days` : ""}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {daysRemaining > 0
                                  ? `${daysRemaining} days left`
                                  : "Expired"}
                              </span>
                              <div className="flex-1 bg-muted rounded-full h-1.5">
                                <div
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    daysRemaining > 30
                                      ? "bg-green-500"
                                      : daysRemaining > 7
                                        ? "bg-yellow-500"
                                        : daysRemaining > 0
                                          ? "bg-orange-500"
                                          : "bg-red-500",
                                  )}
                                  style={{
                                    width: `${Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100))}%`,
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
                            {subscription.subscription_group_sessions?.reduce(
                              (sum: number, group: any) =>
                                sum + (group.sessions_remaining || 0),
                              0,
                            ) || 0}{" "}
                            remaining
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
                          <span className="text-sm text-muted-foreground">
                            Payment Status
                          </span>
                          <Badge
                            variant={
                              totalPaid >= planPrice && planPrice > 0
                                ? "default"
                                : totalPaid > 0
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {totalPaid >= planPrice && planPrice > 0
                              ? "Fully Paid"
                              : totalPaid > 0
                                ? "Partially Paid"
                                : "Not Paid"}
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
    </div>
  );
}
