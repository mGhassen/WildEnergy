"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, Clock, CheckCircle, XCircle, Info, Calendar, Users, Eye } from "lucide-react";
import { SubscriptionDetails } from "@/components/subscription-details";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Plan {
  id: number;
  name: string;
  price: string;
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
}

interface Payment {
  id: number;
  subscription_id: number;
  amount: number;
  status?: string;
  payment_status?: string;
  payment_date: string;
  method?: string;
  payment_type?: string;
  transaction_id?: string;
  notes?: string;
}

interface Subscription {
  id: number;
  plan?: Plan;
  start_date: string;
  end_date: string;
  status: string;
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
}

interface Profile {
  user?: {
    credit?: number;
  };
}

export default function MemberSubscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<'active' | 'history'>('active');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch user credit
  const { data: profile, isLoading: loadingProfile, error: errorProfile } = useQuery<Profile>({
    queryKey: ["/api/auth/session"],
    queryFn: () => apiFetch("/api/auth/session"),
    enabled: isAuthenticated && !authLoading,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to force refetch
  });
  const credit = profile?.user?.credit ?? 0;

  // Fetch all subscriptions
  const { data: subscriptionsRaw, isLoading, error } = useQuery<Subscription[]>({
    queryKey: ["/api/member/subscriptions"],
    queryFn: () => apiFetch("/api/member/subscriptions"),
    enabled: isAuthenticated && !authLoading,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to force refetch
  });
  const subscriptions: Subscription[] = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];

  // Fetch all payments for the user
  const { data: allPaymentsRaw, isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/member/payments"],
    queryFn: () => apiFetch("/api/member/payments"),
    enabled: isAuthenticated && !authLoading,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to force refetch
  });
  const allPayments: Payment[] = Array.isArray(allPaymentsRaw) ? allPaymentsRaw : [];

  // Fetch all registrations to calculate actual sessions used
  const { data: allRegistrationsRaw, isLoading: loadingRegistrations } = useQuery({
    queryKey: ["/api/registrations"],
    queryFn: () => apiFetch("/api/registrations"),
    enabled: isAuthenticated && !authLoading,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const allRegistrations = Array.isArray(allRegistrationsRaw) ? allRegistrationsRaw : [];

  if (authLoading || isLoading || loadingProfile || loadingPayments || loadingRegistrations) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-red-600">
        Please log in to view your subscriptions.
      </div>
    );
  }

  if (error || errorProfile) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-red-600">
        Error loading subscriptions. Please try again later.
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(sub => sub.status !== 'active');

  // Helper: payments for a subscription
  const getPaymentsForSub = (subId: number) => allPayments.filter(p => p.subscription_id === subId);

  // Handle opening subscription details
  const openSubscriptionDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsModalOpen(true);
  };

  // Get status badge for subscription
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header with credit tag */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 md:mb-0">My Subscriptions</h1>
          <p className="text-muted-foreground">View all your subscriptions and payment history</p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-100 to-green-50 border-green-200 shadow-none">
          <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-lg">
            {formatCurrency(credit)}
          </span>
          <Badge variant={credit > 0 ? "default" : "secondary"} className="ml-2 px-2 py-1 rounded-full text-xs">
            {credit > 0 ? "Crédit disponible" : "Aucun crédit"}
          </Badge>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 bg-muted/50 rounded-full p-1 shadow-sm">
          <button
            className={`rounded-full px-5 py-2 flex items-center gap-2 transition-all text-base font-semibold ${mainTab === 'active' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
            onClick={() => setMainTab('active')}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Active
          </button>
          <button
            className={`rounded-full px-5 py-2 flex items-center gap-2 transition-all text-base font-semibold ${mainTab === 'history' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
            onClick={() => setMainTab('history')}
          >
            <Clock className="w-4 h-4 mr-1" /> History
          </button>
        </div>
      </div>

      {/* Active Subscriptions Tab */}
      {mainTab === 'active' && (
        <div className="space-y-6">
          {/* Sessions Used Summary Card */}
          {activeSubscriptions.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Total Sessions Used</h3>
                      <p className="text-sm text-blue-700">Across all your active subscriptions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-900">
                      {allRegistrations.filter(reg => 
                        reg.status === 'registered' || reg.status === 'attended'
                      ).length}
                    </div>
                    <p className="text-sm text-blue-700">sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSubscriptions.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any active subscriptions. Contact the gym to set up your membership.
                </p>
              </CardContent>
            </Card>
          )}
          {activeSubscriptions.map((sub) => {
            return (
              <SubscriptionDetails 
                key={sub.id}
                subscription={sub as any} 
                payments={allPayments as any}
                showTabs={true}
                isAdmin={false}
              />
            );
          })}
        </div>
      )}

      {/* History Tab */}
      {mainTab === 'history' && (
        <div className="space-y-8">
          {/* All Subscriptions List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> All Subscriptions
            </h2>
            {subscriptions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-medium text-foreground mb-2">No Subscriptions</h3>
                  <p className="text-muted-foreground mb-4">
                    You have no subscriptions yet.
                  </p>
                </CardContent>
              </Card>
            )}
            {subscriptions
              .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
              .map((sub) => {
                const subscriptionPayments = getPaymentsForSub(sub.id);
                const totalPaid = subscriptionPayments
                  .filter(p => p.payment_status === 'paid')
                  .reduce((sum, p) => sum + (p.amount || 0), 0);
                const planPrice = Number(sub.plan?.price) || 0;
                const remainingAmount = Math.max(0, planPrice - totalPaid);
                const isFullyPaid = remainingAmount === 0;
                const progressPercentage = planPrice > 0 ? (totalPaid / planPrice) * 100 : 0;

                return (
                  <Card 
                    key={sub.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
                    onClick={() => openSubscriptionDetails(sub)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header with plan name and status */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold text-foreground">{sub.plan?.name || 'Unknown Plan'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(sub.start_date)} - {formatDate(sub.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(sub.status)}
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Payment Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Payment Progress</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(totalPaid)} / {formatCurrency(planPrice)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isFullyPaid 
                                  ? 'bg-green-500' 
                                  : progressPercentage > 50 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                            <div className="text-xs text-muted-foreground">Payé</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{formatCurrency(remainingAmount)}</div>
                            <div className="text-xs text-muted-foreground">Restant</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{subscriptionPayments.length}</div>
                            <div className="text-xs text-muted-foreground">Paiements</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{Math.round(progressPercentage)}%</div>
                            <div className="text-xs text-muted-foreground">Complet</div>
                          </div>
                        </div>

                        {/* Quick Actions Hint */}
                        <div className="flex items-center justify-center pt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Click to view full details and manage payments
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* All Payments Table */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> All Payments
            </h2>
            {allPayments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <div>No payments found.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Subscription</th>
                      <th className="px-4 py-2 text-left">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map(payment => {
                      const sub = subscriptions.find(s => s.id === payment.subscription_id);
                      return (
                        <tr key={payment.id} className="border-b">
                          <td className="px-4 py-2">{formatDate(payment.payment_date)}</td>
                          <td className="px-4 py-2">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-2">
                            <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                              {payment.status === 'paid' ? 'Paid' : payment.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">{sub?.plan?.name || 'N/A'}</td>
                          <td className="px-4 py-2">{payment.method}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Details Dialog */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <SubscriptionDetails 
              subscription={selectedSubscription as any} 
              payments={allPayments as any}
              showTabs={true}
              isAdmin={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
