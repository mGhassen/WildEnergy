"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatePayment } from "@/hooks/usePayments";
import { formatDate } from "@/lib/date";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/config";
import { CreditCard, Info, Calendar, Users, Plus, DollarSign } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: string | number;
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
  member_id?: string;
  amount: number;
  status?: string;
  payment_date: string;
  method?: string;
  payment_status?: string;
  payment_type?: string;
  transaction_id?: string;
  notes?: string;
}

interface Subscription {
  id: number;
  member_id?: string;
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

interface SubscriptionDetailsProps {
  subscription: Subscription;
  payments?: Payment[];
  showTabs?: boolean;
  isAdmin?: boolean;
  member?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export function SubscriptionDetails({ 
  subscription, 
  payments = [], 
  showTabs = true,
  isAdmin = false,
  member
}: SubscriptionDetailsProps) {
  const [subTab, setSubTab] = useState<'details' | 'payments'>('details');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    payment_type: "cash",
    payment_status: "paid",
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: "",
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const plan = subscription.plan || { name: "", price: "", plan_groups: [] };
  
  // Calculate total sessions from plan_groups
  const totalSessions = plan.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) || 0;
  
  // Calculate remaining sessions from group sessions
  const totalRemainingSessions = subscription.subscription_group_sessions?.reduce((sum: number, group: any) => sum + (group.sessions_remaining || 0), 0) || 0;
  
  // Helper: payments for this subscription
  const getPaymentsForSub = (subId: number) => payments.filter(p => p.subscription_id === subId);

  // Calculate payment information
  const subscriptionPayments = getPaymentsForSub(subscription.id);
  const totalPaid = subscriptionPayments
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Plan price is a number from the API
  const planPrice = Number(plan.price) || 0;
  
  // Calculate remaining amount
  const remainingAmount = Math.max(0, planPrice - totalPaid);

  // Payment creation mutation
  const createPaymentMutation = useCreatePayment();

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return formatCurrency(numPrice);
  };

  // Payment handlers
  const handleAddPayment = () => {
    setPaymentFormData(prev => ({
      ...prev,
      amount: remainingAmount.toFixed(2),
    }));
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = () => {
    const paymentData = {
      subscription_id: subscription.id,
      member_id: subscription.member_id || '',
      amount: parseFloat(paymentFormData.amount),
      payment_type: paymentFormData.payment_type,
      status: paymentFormData.payment_status,
      payment_date: paymentFormData.payment_date,
      payment_reference: paymentFormData.transaction_id || undefined,
    };
    
    createPaymentMutation.mutate(paymentData, {
      onSuccess: () => {
        setIsPaymentModalOpen(false);
        setPaymentFormData({
          amount: "",
          payment_type: "cash",
          payment_status: "paid",
          payment_date: new Date().toISOString().split('T')[0],
          transaction_id: "",
          notes: "",
        });
      }
    });
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{plan.name || "Plan"}</span>
          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
            {subscription.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isAdmin && member ? (
            <div>
              <div className="font-medium">{member.firstName} {member.lastName}</div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>
          ) : (
            isAdmin ? 'Subscription details' : 'Active membership details'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini-tabs for details/payments */}
        {showTabs && (
          <div className="flex gap-2 mb-4">
            <button
              className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'details' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              onClick={() => setSubTab('details')}
            >
              <Info className="w-4 h-4" /> Details
            </button>
            <button
              className={`rounded-full px-4 py-1 text-sm font-medium flex items-center gap-1 transition-all ${subTab === 'payments' ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              onClick={() => setSubTab('payments')}
            >
              <CreditCard className="w-4 h-4" /> Payments
            </button>
          </div>
        )}

        {(!showTabs || subTab === 'details') && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Sessions Remaining</p>
                <p className="text-3xl font-bold text-primary">{totalRemainingSessions}</p>
                <p className="text-xs text-muted-foreground mt-1">of {totalSessions} total</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Plan Price</p>
                <p className="text-2xl font-bold text-foreground">{formatPrice(plan.price ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{plan.name}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(totalPaid)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {remainingAmount > 0 ? `${formatPrice(remainingAmount)} remaining` : 'Fully paid'}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                  {subscription.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Until {formatDate(subscription.end_date)}</p>
              </div>
            </div>

            {/* Subscription & Plan Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Subscription Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">{formatDate(subscription.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">{formatDate(subscription.end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {Math.ceil((new Date(subscription.end_date).getTime() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
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
                    <span className="font-medium text-orange-600">{totalSessions - totalRemainingSessions}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Groups & Sessions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full"></div>
                <h4 className="font-medium text-foreground">Groups & Sessions</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Groups and categories included in your subscription plan with session tracking
              </p>
              
              {(() => {
                const planGroups = plan.plan_groups || [];
                const groupSessions = subscription.subscription_group_sessions || [];
                
                if (planGroups.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-sm">No groups assigned to this plan</div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {planGroups.map((planGroup: any) => {
                      const groupSession = groupSessions.find((gs: any) => gs.group_id === planGroup.groups.id);
                      const sessionsRemaining = groupSession?.sessions_remaining || 0;
                      const totalSessions = groupSession?.total_sessions || planGroup.session_count || 0;
                      const sessionsUsed = totalSessions - sessionsRemaining;
                      const progressPercentage = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;

                      return (
                        <div key={planGroup.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: planGroup.groups.color }}
                              ></div>
                              <div>
                                <div className="font-medium">{planGroup.groups.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {planGroup.groups.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {planGroup.is_free && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Free
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {planGroup.session_count} sessions
                              </Badge>
                            </div>
                          </div>

                          {/* Session Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Sessions Used</span>
                              <span className="font-medium">{sessionsUsed} / {totalSessions}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Remaining: {sessionsRemaining}</span>
                              <span>{Math.round(progressPercentage)}% used</span>
                            </div>
                          </div>

                          {/* Categories */}
                          {planGroup.groups.category_groups && planGroup.groups.category_groups.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">Categories</div>
                              <div className="flex flex-wrap gap-2">
                                {planGroup.groups.category_groups.map((categoryGroup: any) => (
                                  <Badge 
                                    key={categoryGroup.categories.id} 
                                    variant="outline" 
                                    className="text-xs border-0 text-white"
                                    style={{ 
                                      backgroundColor: categoryGroup.categories.color,
                                      color: 'white'
                                    }}
                                  >
                                    {categoryGroup.categories.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {showTabs && subTab === 'payments' && (
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold">{formatPrice(planPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-lg font-bold text-green-600">{formatPrice(totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatPrice(remainingAmount)}
                </p>
              </div>
            </div>

            {/* Add Payment Button */}
            {isAdmin && remainingAmount > 0 && (
              <div className="flex justify-center">
                <Button onClick={handleAddPayment} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Payment
                </Button>
              </div>
            )}

            {/* Payments List */}
            <div className="space-y-2">
              {getPaymentsForSub(subscription.id).length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <div>No payments found for this subscription.</div>
                </div>
              ) : (
                getPaymentsForSub(subscription.id).map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatPrice(payment.amount)}</span>
                          <span className="text-xs text-muted-foreground">
                            {payment.payment_type && `(${payment.payment_type})`}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                          {payment.transaction_id && ` • ${payment.transaction_id}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant={(payment.status || payment.payment_status) === 'paid' ? 'default' : 'secondary'}>
                      {(payment.status || payment.payment_status) === 'paid' ? 'Paid' : (payment.status || payment.payment_status)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Add a payment for this subscription. The amount is prefilled with the remaining balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_type" className="text-right">
                Type
              </Label>
              <Select
                value={paymentFormData.payment_type}
                onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_type: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_status" className="text-right">
                Status
              </Label>
              <Select
                value={paymentFormData.payment_status}
                onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_status: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_date" className="text-right">
                Date
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentFormData.payment_date}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction_id" className="text-right">
                Transaction ID
              </Label>
              <Input
                id="transaction_id"
                value={paymentFormData.transaction_id}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, transaction_id: e.target.value }))}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                rows={3}
                placeholder="Optional payment notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentSubmit}
              disabled={createPaymentMutation.isPending || !paymentFormData.amount}
            >
              {createPaymentMutation.isPending ? "Creating..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
