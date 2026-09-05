"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, CreditCard, RefreshCw, MoreVertical, CalendarCheck } from "lucide-react";
import { useSubscriptions, useSubscription } from "@/hooks/useSubscriptions";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { SubscriptionDetails } from "@/components/subscription-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { SubscriptionRegistrationCard } from "@/components/subscription-registration-card";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Payment } from "@/lib/api/payments";
import { CardSkeleton } from "@/components/skeletons";
import {
  getPaymentStatus,
  getPaymentStatusBadgeVariant,
  getPaymentStatusLabel,
  isFreePlan,
} from "@/lib/subscription-status";

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
  subscription_pool_sessions?: {
    id: number;
    pool_id: number;
    sessions_remaining: number;
    total_sessions: number;
  }[];
};

export default function AdminSubscriptionDetails() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;

  const { data: subscriptions, isLoading: loadingSubscriptions } =
    useSubscriptions();
  const { data: subscriptionDetail, isLoading: loadingSubscriptionDetail } =
    useSubscription(Number.isFinite(parseInt(subscriptionId, 10)) ? parseInt(subscriptionId, 10) : 0);
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();

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
          plan: plans.find((p: any) => p.id === sub.plan_id) || sub.plan || null,
          subscription_group_sessions: sub.subscription_group_sessions || [],
          subscription_pool_sessions: sub.subscription_pool_sessions || [],
        }))
      : [];
  }, [subscriptions, mappedMembers, plans]);

  const subscription = useMemo(() => {
    const fromList = mappedSubscriptions.find(
      (sub: Subscription) => sub.id === parseInt(subscriptionId, 10),
    );
    if (subscriptionDetail) {
      return {
        ...fromList,
        ...subscriptionDetail,
        plan: subscriptionDetail.plan ?? fromList?.plan ?? null,
        subscription_group_sessions:
          subscriptionDetail.subscription_group_sessions ??
          fromList?.subscription_group_sessions ??
          [],
        subscription_pool_sessions:
          subscriptionDetail.subscription_pool_sessions ??
          fromList?.subscription_pool_sessions ??
          [],
      };
    }
    return fromList;
  }, [mappedSubscriptions, subscriptionId, subscriptionDetail]);

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
  const free = isFreePlan(subscription?.plan);
  const remainingAmount = free ? 0 : Math.max(0, planPrice - totalPaid);
  const paymentStatus = getPaymentStatus({
    totalPaid,
    planPrice,
    isFree: free,
  });
  const isFullyPaid =
    paymentStatus === "fully_paid" || paymentStatus === "free";


  const handleEditPayment = (payment: Payment) => {
    router.push(`/admin/payments/${payment.id}/edit?from=${encodeURIComponent(`/admin/subscriptions/${subscriptionId}`)}`);
  };

  const handleDeletePayment = (payment: Payment) => {
    router.push(`/admin/payments/${payment.id}/delete?from=${encodeURIComponent(`/admin/subscriptions/${subscriptionId}`)}`);
  };

  const formatPrice = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  const subscriptionRegistrations = useMemo(() => {
    return subscriptionDetail?.registrations || [];
  }, [subscriptionDetail]);

  if (
    loadingSubscriptions ||
    loadingSubscriptionDetail ||
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
                onClick={() =>
                  router.push(
                    `/admin/subscriptions/${subscriptionId}/refund-session`,
                  )
                }
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refund 1 Session
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
          <TabsTrigger value="sessions">
            Sessions ({subscriptionRegistrations.length})
          </TabsTrigger>
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

        <TabsContent value="sessions">
          <Card className="shadow-none border-none bg-transparent">
            <CardHeader className="p-0 mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Registered Sessions</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Courses registered against this subscription, with check-in and
                session pool used.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptionRegistrations.length === 0 ? (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    No courses registered on this subscription yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionRegistrations.map((reg) => (
                    <SubscriptionRegistrationCard
                      key={reg.id}
                      registration={reg}
                      onClick={
                        reg.course?.id
                          ? () => router.push(`/admin/courses/${reg.course!.id}`)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                  <span className="font-semibold">
                    {free ? "Free" : formatPrice(planPrice)}
                  </span>
                </div>
                <Badge variant={getPaymentStatusBadgeVariant(paymentStatus)}>
                  {getPaymentStatusLabel(paymentStatus)}
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
                <div className="space-y-2">
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
