"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, Clock, CheckCircle, XCircle, Info, Calendar } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: string;
  max_sessions: number;
}

interface Payment {
  id: number;
  subscription_id: number;
  amount: number;
  status: string;
  payment_date: string;
  method: string;
}

interface Subscription {
  id: number;
  plan?: Plan;
  start_date: string;
  end_date: string;
  sessions_remaining: number;
  status: string;
}

interface Profile {
  user?: {
    credit?: number;
  };
}

export default function MemberSubscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<'active' | 'history'>('active');
  const [subTabs, setSubTabs] = useState<{ [subId: number]: 'details' | 'payments' }>({});

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
            {credit} TND
          </span>
          <Badge variant={credit > 0 ? "default" : "secondary"} className="ml-2 px-2 py-1 rounded-full text-xs">
            {credit > 0 ? "Credit Available" : "No Credit"}
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
            console.log('Subscription data:', sub);
            console.log('Plan data:', sub.plan);
            
            const plan = sub.plan || { name: "", price: "", max_sessions: 0 };
            const totalSessions = plan.max_sessions ?? 0;
            
            console.log('Total sessions calculated:', totalSessions);
            
            // Bonus sessions (always 0 in this system)
            const bonusSessions = 0;
            
            const subTab = subTabs[sub.id] || 'details';
            return (
              <Card key={sub.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name || "Plan"}</span>
                    <Badge variant="default">Active</Badge>
                  </CardTitle>
                  <CardDescription>Active membership details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mini-tabs for details/payments */}
                  <div className="flex gap-2 mb-4">
                    <button
                      className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'details' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                      onClick={() => setSubTabs(t => ({ ...t, [sub.id]: 'details' }))}
                    >
                      <Info className="w-4 h-4" /> Details
                    </button>
                    <button
                      className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'payments' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                      onClick={() => setSubTabs(t => ({ ...t, [sub.id]: 'payments' }))}
                    >
                      <CreditCard className="w-4 h-4" /> Payments
                    </button>
                  </div>
                  {subTab === 'details' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/5 rounded-lg">
                          <p className="text-sm text-muted-foreground">Sessions Remaining</p>
                          <p className="text-2xl font-bold text-primary">{sub.sessions_remaining}</p>
                          {bonusSessions > 0 && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              +{bonusSessions} bonus
                            </p>
                          )}
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                          <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
                          {bonusSessions > 0 && (
                            <p className="text-xs text-green-600 font-medium">
                              +{bonusSessions} bonus available
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>
                          <p className="font-medium">{formatDate(sub.start_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End Date:</span>
                          <p className="font-medium">{formatDate(sub.end_date)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {getPaymentsForSub(sub.id).length === 0 ? (
                        <div className="text-center text-muted-foreground py-6">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <div>No payments found for this subscription.</div>
                        </div>
                      ) : (
                        getPaymentsForSub(sub.id).map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <span className="font-medium">{payment.amount} TND</span>
                              <span className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</span>
                            </div>
                            <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                              {payment.status === 'paid' ? 'Paid' : payment.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* History Tab */}
      {mainTab === 'history' && (
        <div className="space-y-8">
          <div className="space-y-6">
            {inactiveSubscriptions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-medium text-foreground mb-2">No History</h3>
                  <p className="text-muted-foreground mb-4">
                    You have no past subscriptions.
                  </p>
                </CardContent>
              </Card>
            )}
            {inactiveSubscriptions.map((sub) => {
              const plan = sub.plan || { name: "", price: "", max_sessions: 0 };
              const subTab = subTabs[sub.id] || 'details';
              return (
                <Card key={sub.id} className="border-l-4 border-l-muted opacity-75">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name || "Plan"}</span>
                      <Badge variant="secondary">{sub.status}</Badge>
                    </CardTitle>
                    <CardDescription>Inactive membership details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mini-tabs for details/payments */}
                    <div className="flex gap-2 mb-4">
                      <button
                        className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'details' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                        onClick={() => setSubTabs(t => ({ ...t, [sub.id]: 'details' }))}
                      >
                        <Info className="w-4 h-4" /> Details
                      </button>
                      <button
                        className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'payments' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                        onClick={() => setSubTabs(t => ({ ...t, [sub.id]: 'payments' }))}
                      >
                        <CreditCard className="w-4 h-4" /> Payments
                      </button>
                    </div>
                    {subTab === 'details' ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>
                          <p className="font-medium">{formatDate(sub.start_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End Date:</span>
                          <p className="font-medium">{formatDate(sub.end_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">{plan.price ?? 0} TND</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="secondary" className="ml-1">{sub.status}</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getPaymentsForSub(sub.id).length === 0 ? (
                          <div className="text-center text-muted-foreground py-6">
                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <div>No payments found for this subscription.</div>
                          </div>
                        ) : (
                          getPaymentsForSub(sub.id).map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                <span className="font-medium">{payment.amount} TND</span>
                                <span className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</span>
                              </div>
                              <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                                {payment.status === 'paid' ? 'Paid' : payment.status}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
                          <td className="px-4 py-2">{payment.amount} TND</td>
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
    </div>
  );
}
