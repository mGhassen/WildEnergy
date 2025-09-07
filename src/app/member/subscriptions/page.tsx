"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreditCard, Clock, CheckCircle, XCircle, Info, Calendar, Users } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: string;
  max_sessions: number;
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
            
            const plan = sub.plan || { name: "", price: "", max_sessions: 0, plan_groups: [] };
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
                    <div className="space-y-6">
                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">Sessions Remaining</p>
                          <p className="text-3xl font-bold text-primary">{sub.sessions_remaining}</p>
                          <p className="text-xs text-muted-foreground mt-1">of {totalSessions} total</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg border border-border/50">
                          <p className="text-sm text-muted-foreground mb-1">Plan Price</p>
                          <p className="text-2xl font-bold text-foreground">{plan.price ?? 0} TND</p>
                          <p className="text-xs text-muted-foreground mt-1">{plan.name}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
                          <p className="text-sm text-muted-foreground mb-1">Status</p>
                          <Badge variant="default" className="text-sm">Active</Badge>
                          <p className="text-xs text-muted-foreground mt-1">Until {formatDate(sub.end_date)}</p>
                        </div>
                      </div>

                      {/* Subscription Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Subscription Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                          <span className="text-muted-foreground">Start Date:</span>
                              <span className="font-medium">{formatDate(sub.start_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">End Date:</span>
                              <span className="font-medium">{formatDate(sub.end_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">
                                {Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Plan Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Plan Name:</span>
                              <span className="font-medium">{plan.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Sessions:</span>
                              <span className="font-medium">{totalSessions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sessions Used:</span>
                              <span className="font-medium text-orange-600">{totalSessions - sub.sessions_remaining}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Groups and Sessions */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Groups & Sessions
                        </h4>
                        
                        {(() => {
                          const planGroups = plan.plan_groups || [];
                          const groupSessions = sub.subscription_group_sessions || [];
                          
                          if (planGroups.length === 0 && groupSessions.length === 0) {
                            return (
                              <div className="text-center py-8 border-2 border-dashed border-muted/50 rounded-lg bg-muted/10">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                  No Group Sessions
                                </h3>
                                <p className="text-sm text-muted-foreground/70">
                                  This plan doesn't include any specific group sessions
                                </p>
                              </div>
                            );
                          }

                          // Combine plan groups with actual session data
                          const combinedGroups = planGroups.map(planGroup => {
                            const sessionData = groupSessions.find(gs => gs.group_id === planGroup.group_id);
                            return {
                              ...planGroup,
                              sessions_remaining: sessionData?.sessions_remaining || 0,
                              total_sessions: sessionData?.total_sessions || planGroup.session_count,
                              groups: planGroup.groups
                            };
                          });

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {combinedGroups.map((group: any) => (
                                <div key={group.id} className="p-4 bg-muted/20 rounded-lg border border-border/50">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-4 h-4 rounded-full shadow-sm border border-white/20" 
                                        style={{ backgroundColor: group.groups?.color || '#6b7280' }}
                                      />
                                      <div>
                                        <h5 className="font-medium text-foreground">
                                          {group.groups?.name || 'Unknown Group'}
                                        </h5>
                                        {group.groups?.description && (
                                          <p className="text-xs text-muted-foreground">
                                            {group.groups.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-primary">
                                        {group.sessions_remaining}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        of {group.total_sessions}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Progress bar */}
                                  <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all duration-300"
                                      style={{ 
                                        width: `${Math.max(0, (group.sessions_remaining / group.total_sessions) * 100)}%` 
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Session info */}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {group.sessions_remaining === 0 ? 'No sessions remaining' : 
                                       group.sessions_remaining === 1 ? '1 session remaining' : 
                                       `${group.sessions_remaining} sessions remaining`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {group.is_free && (
                                        <Badge variant="secondary" className="text-xs">
                                          Free
                                        </Badge>
                                      )}
                                      <Badge 
                                        variant={group.sessions_remaining === 0 ? 'destructive' : 
                                               group.sessions_remaining <= 2 ? 'secondary' : 'default'}
                                        className="text-xs"
                                      >
                                        {group.sessions_remaining === 0 ? 'Exhausted' : 
                                         group.sessions_remaining <= 2 ? 'Low' : 'Available'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Categories */}
                                  {group.groups?.categories && group.groups.categories.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border/30">
                                      <p className="text-xs text-muted-foreground mb-2">Categories:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {group.groups.categories.map((category: any) => (
                                          <div key={category.id} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs">
                                            <div 
                                              className="w-2 h-2 rounded-full" 
                                              style={{ backgroundColor: category.color }}
                                            />
                                            <span className="text-foreground">{category.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
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
              const plan = sub.plan || { name: "", price: "", max_sessions: 0, plan_groups: [] };
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
                      <div className="space-y-6">
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-sm text-muted-foreground mb-1">Plan Price</p>
                            <p className="text-2xl font-bold text-foreground">{plan.price ?? 0} TND</p>
                            <p className="text-xs text-muted-foreground mt-1">{plan.name}</p>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <Badge variant="secondary" className="text-sm">{sub.status}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Ended {formatDate(sub.end_date)}</p>
                          </div>
                          <div className="text-center p-4 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-sm text-muted-foreground mb-1">Duration</p>
                            <p className="text-2xl font-bold text-foreground">
                              {Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">days</p>
                          </div>
                        </div>

                        {/* Subscription Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              Subscription Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Start Date:</span>
                                <span className="font-medium">{formatDate(sub.start_date)}</span>
                              </div>
                              <div className="flex justify-between">
                          <span className="text-muted-foreground">End Date:</span>
                                <span className="font-medium">{formatDate(sub.end_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Sessions:</span>
                                <span className="font-medium">{plan.max_sessions || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Plan Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Plan Name:</span>
                                <span className="font-medium">{plan.name}</span>
                        </div>
                              <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                                <span className="font-medium">{plan.price ?? 0} TND</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="secondary">{sub.status}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Groups Information */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Groups & Sessions
                          </h4>
                          
                          {(() => {
                            const planGroups = plan.plan_groups || [];
                            
                            if (planGroups.length === 0) {
                              return (
                                <div className="text-center py-8 border-2 border-dashed border-muted/50 rounded-lg bg-muted/10">
                                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                    No Group Sessions
                                  </h3>
                                  <p className="text-sm text-muted-foreground/70">
                                    This plan didn't include any specific group sessions
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {planGroups.map((group: any) => (
                                  <div key={group.id} className="p-4 bg-muted/20 rounded-lg border border-border/50">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div 
                                          className="w-4 h-4 rounded-full shadow-sm border border-white/20" 
                                          style={{ backgroundColor: group.groups?.color || '#6b7280' }}
                                        />
                        <div>
                                          <h5 className="font-medium text-foreground">
                                            {group.groups?.name || 'Unknown Group'}
                                          </h5>
                                          {group.groups?.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {group.groups.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xl font-bold text-muted-foreground">
                                          {group.session_count}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          sessions
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Categories */}
                                    {group.groups?.categories && group.groups.categories.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border/30">
                                        <p className="text-xs text-muted-foreground mb-2">Categories:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {group.groups.categories.map((category: any) => (
                                            <div key={category.id} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs">
                                              <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: category.color }}
                                              />
                                              <span className="text-foreground">{category.name}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
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
