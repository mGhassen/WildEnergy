import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign } from "lucide-react";
import { getInitials, formatDate } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

type Payment = {
  id: number;
  subscriptionId: number;
  userId: string;
  amount: number;
  paymentType: string;
  paymentStatus: string;
  transactionId?: string;
  paymentDate?: string;
  dueDate?: string;
  discount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

export default function AdminPayments() {
  const [searchTerm, setSearchTerm] = useState("");

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
        const member = mappedMembers.find((m: any) => m.id === payment.userId) || null;
        const subscription = subscriptions.find((s: any) => s.id === payment.subscriptionId) || null;
        const plan = subscription ? mappedPlans.find((p: any) => p.id === subscription.plan_id || p.id === subscription.planId) || null : null;
        
        return {
          ...payment,
          member,
          subscription: subscription ? { ...subscription, plan } : null,
        };
      })
    : [];

  // Filter payments
  const filteredPayments = mappedPayments.filter((payment) =>
    `${payment.member?.firstName || ''} ${payment.member?.lastName || ''} ${payment.subscription?.plan?.name || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            {filteredPayments.length} of {mappedPayments.length} payments
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by member name or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
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
                  <TableCell>{payment.paymentType || '-'}</TableCell>
                  <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(payment.paymentStatus)}>
                      {getPaymentStatusText(payment.paymentStatus)}
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