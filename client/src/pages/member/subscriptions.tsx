import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import React from "react";

interface Plan {
  id: number;
  name: string;
  price: string;
  max_sessions: number;
}

interface Subscription {
  id: number;
  plan?: Plan;
  start_date: string;
  end_date: string;
  sessions_remaining: number;
  status: string;
}

export default function MemberSubscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch user credit
  const { data: profile, isLoading: loadingProfile, error: errorProfile } = useQuery<any>({
    queryKey: ["/api/auth/session"],
    queryFn: () => apiFetch("/api/auth/session"),
    enabled: isAuthenticated && !authLoading,
  });
  const credit = profile?.user?.credit ?? 0;

  // Fetch all subscriptions
  const { data: subscriptionsRaw, isLoading, error } = useQuery<Subscription[]>({
    queryKey: ["/api/member/subscriptions"],
    queryFn: () => apiFetch("/api/member/subscriptions"),
    enabled: isAuthenticated && !authLoading,
  });
  const subscriptions: Subscription[] = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];

  if (authLoading || isLoading || loadingProfile) {
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header with credit tag */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 md:mb-0">My Subscriptions</h1>
          <p className="text-muted-foreground">View all your subscriptions</p>
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

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Active Subscriptions</h2>
          {activeSubscriptions.map((sub) => {
            const plan = sub.plan || { name: "", price: "", max_sessions: 0 };
            const totalSessions = plan.max_sessions ?? 0;
            const sessionsUsed = totalSessions - sub.sessions_remaining;
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                      <p className="text-2xl font-bold text-primary">{sub.sessions_remaining}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Sessions Used</p>
                      <p className="text-2xl font-bold text-foreground">{sessionsUsed}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                      <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inactive Subscriptions */}
      {inactiveSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Inactive Subscriptions</h2>
          {inactiveSubscriptions.map((sub) => {
            const plan = sub.plan || { name: "", price: "", max_sessions: 0 };
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Subscriptions */}
      {subscriptions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">No Subscriptions</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any subscriptions. Contact the gym to set up your membership.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
