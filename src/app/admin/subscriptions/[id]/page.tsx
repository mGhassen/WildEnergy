"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, CreditCard, RefreshCw, MoreVertical } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { SubscriptionDetails } from "@/components/subscription-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useManualRefundSessions } from "@/hooks/useSubscriptions";
import { useToast } from "@/hooks/use-toast";
import { Payment } from "@/lib/api/payments";
import { CardSkeleton } from "@/components/skeletons";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  credit: number;
};

type Plan = {
  id: number;
  name: string;
  price: number;
  sessionsIncluded: number;
  durationDays: number;
  duration: number;
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

export default function AdminSubscriptionDetails() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;
  const { toast } = useToast();

  const { data: subscriptions, isLoading: loadingSubscriptions } =
    useSubscriptions();
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();

  const manualRefundMutation = useManualRefundSessions();

  const mappedMembers = useMemo(() => {
    return Array.isArray(members)
      ? members.map((m: any) => ({
          ...m,
          firstName: m.firstName || m.first_name || "",
          lastName: m.lastName || m.last_name || "",
          email: m.email,
          status: m.member_status,
          member_status: m.member_status,
          credit: m.credit || 0,
        }))
      : [];
  }, [members]);

  const mappedSubscriptions = useMemo(() => {
    return Array.isArray(subscriptions) &&
      Array.isArray(mappedMembers) &&
      Array.isArray(plans)
      ? subscriptions.map((sub: any) => ({
          ...sub,
          member: mappedMembers.find((m: any) => m.id === sub.member_id) || null,
          plan: plans.find((p: any) => p.id === sub.plan_id) || null,
          subscription_group_sessions: sub.subscription_group_sessions || [],
        }))
      : [];
  }, [subscriptions, mappedMembers, plans]);

  const subscription = useMemo(() => {
    return mappedSubscriptions.find(
      (sub: Subscription) => sub.id === parseInt(subscriptionId),
    );
  }, [mappedSubscriptions, subscriptionId]);

  const getPaymentsForSubscription = (id: number) => {
    return payments.filter((payment) => payment.subscription_id === id);
  };

  const subscriptionPayments = subscription
    ? getPaymentsForSubscription(subscription.id)
    : [];
  const totalPaid = subscriptionPayments
    .filter((p) => p.payment_status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const planPrice = Number(subscription?.plan?.price) || 0;
  const remainingAmount = Math.max(0, planPrice - totalPaid);
  const isFullyPaid = remainingAmount === 0;

  const handleManualRefund = () => {
    if (!subscription?.id) return;

    const refundableGroups =
      subscription.subscription_group_sessions?.filter(
        (gs: any) => gs.sessions_remaining < gs.total_sessions,
      ) || [];

    if (refundableGroups.length === 0) {
      toast({
        title: "Cannot refund sessions",
        description:
          "All group sessions are already at maximum capacity. No sessions can be refunded.",
        variant: "destructive",
      });
      return;
    }

    if (refundableGroups.length === 1) {
      manualRefundMutation.mutate({
        subscriptionId: subscription.id,
        sessionsToRefund: 1,
        groupId: refundableGroups[0].group_id,
      });
    } else {
      router.push(`/admin/subscriptions/${subscriptionId}/refund-session`);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    router.push(`/admin/payments/${payment.id}/edit`);
  };

  const handleDeletePayment = (payment: Payment) => {
    router.push(`/admin/payments/${payment.id}/delete`);
  };

  const formatPrice = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  if (
    loadingSubscriptions ||
    loadingMembers ||
    loadingPlans ||
    loadingPayments
  ) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-muted rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        </div>
        <CardSkeleton showImage={false} lines={8} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Subscription Not Found
          </h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              The subscription you&apos;re looking for doesn&apos;t exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Subscription Details
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/subscriptions/${subscriptionId}/edit`)
                }
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Subscription
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Session Management
              </div>
              <DropdownMenuItem
                onClick={handleManualRefund}
                disabled={manualRefundMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {manualRefundMutation.isPending
                  ? "Refunding..."
                  : "Refund 1 Session"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/admin/subscriptions/${subscriptionId}/consume-session`,
                  )
                }
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Consume 1 Session
              </DropdownMenuItem>

              {!isFullyPaid && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Payment Management
                  </div>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/admin/subscriptions/${subscriptionId}/payments/new`,
                      )
                    }
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Payment
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <div className="px-2 py-1.5 text-xs font-semibold text-destructive">
                Danger Zone
              </div>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/subscriptions/${subscriptionId}/delete`)
                }
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Subscription
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <SubscriptionDetails
            subscription={subscription as any}
            payments={payments as any}
            showTabs={false}
            isAdmin={true}
            member={{
              firstName: subscription.member?.firstName,
              lastName: subscription.member?.lastName,
              email: subscription.member?.email,
            }}
          />
        </TabsContent>

        <TabsContent value="payments">
          <Card className="shadow-none border-none bg-transparent">
            <CardHeader className="p-0 mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Payments</CardTitle>
              </div>
              <div className="flex flex-wrap gap-4 items-center text-sm mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-semibold">{formatPrice(totalPaid)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Plan Price:</span>
                  <span className="font-semibold">{formatPrice(planPrice)}</span>
                </div>
                <Badge
                  variant={
                    isFullyPaid
                      ? "default"
                      : remainingAmount > 0
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {isFullyPaid
                    ? "Fully Paid"
                    : remainingAmount > 0
                      ? "Partially Paid"
                      : "Not Paid"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptionPayments.length === 0 ? (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    No payments recorded for this subscription.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {subscriptionPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center md:justify-between bg-muted/30 shadow-sm gap-2"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                        <span className="font-semibold text-base text-primary">
                          {formatPrice(payment.amount)}
                        </span>
                        <Badge
                          variant={
                            payment.payment_status === "paid"
                              ? "default"
                              : payment.payment_status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className="ml-2 text-xs capitalize"
                        >
                          {payment.payment_status}
                        </Badge>
                        <span className="text-muted-foreground ml-2">
                          {payment.payment_type} •{" "}
                          {formatDate(payment.payment_date)}
                        </span>
                        {payment.payment_reference && (
                          <span className="text-muted-foreground text-xs ml-2">
                            Ref: {payment.payment_reference}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 md:mt-0 md:ml-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditPayment(payment)}
                          title="Edit Payment"
                        >
                          <span className="sr-only">Edit Payment</span>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeletePayment(payment)}
                          title="Delete Payment"
                        >
                          <span className="sr-only">Delete Payment</span>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
