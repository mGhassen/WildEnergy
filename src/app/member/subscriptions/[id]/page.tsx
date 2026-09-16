"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useMemberSubscriptions } from "@/hooks/useMemberSubscriptions";
import { useMemberPayments } from "@/hooks/useMemberPayments";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionDetails } from "@/components/subscription-details";
import { SubscriptionSeatsPanel } from "@/components/subscription-seats-panel";
import { CardSkeleton } from "@/components/skeletons";

interface MemberPlan {
  id: number;
  name: string;
  price: string;
  max_seats?: number;
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

interface MemberPayment {
  id: number;
  subscription_id: number;
  amount: number;
  status?: string;
  payment_status?: string;
  payment_date: string;
  method?: string;
  payment_type?: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
}

interface MemberSubscription {
  id: number;
  plan?: MemberPlan;
  start_date: string;
  end_date: string;
  status: string;
  access?: "owner" | "seat";
  seat_role?: string;
  subscription_seats?: any[];
  subscription_invites?: any[];
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

export default function MemberSubscriptionDetails() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: subscriptionsRaw, isLoading: loadingSubscriptions } = useMemberSubscriptions();
  const { data: allPaymentsRaw, isLoading: loadingPayments } = useMemberPayments();

  const subscriptions: any[] = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const allPayments: MemberPayment[] = Array.isArray(allPaymentsRaw) ? allPaymentsRaw : [];

  const subscription = subscriptions.find((sub: MemberSubscription) => sub.id === parseInt(subscriptionId));

  const isSeat = subscription?.access === "seat" || subscription?.seat_role === "member";
  const isOwner = !isSeat;
  const maxSeats = Number(subscription?.plan?.max_seats ?? 1);

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

  if (authLoading || loadingSubscriptions || loadingPayments) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-muted rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <CardSkeleton showImage={false} lines={8} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-red-600">
        Please log in to view subscription details.
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Subscription Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">The subscription you&apos;re looking for doesn&apos;t exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subscription Details</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">{subscription.plan?.name}</span>
              {getStatusBadge(subscription.status)}
              {isSeat && (
                <Badge variant="outline">Group plan (invited)</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <SubscriptionDetails 
        subscription={subscription as any} 
        payments={isOwner ? (allPayments as any) : []}
        showTabs={true}
        isAdmin={false}
      />

      {maxSeats > 1 && (
        <SubscriptionSeatsPanel
          subscriptionId={subscription.id}
          maxSeats={maxSeats}
          seats={subscription.subscription_seats || []}
          invites={isOwner ? (subscription.subscription_invites || []) : []}
          canManage={isOwner}
          apiMode="member"
        />
      )}
    </div>
  );
}
