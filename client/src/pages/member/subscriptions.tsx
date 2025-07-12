import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, Target, Star, QrCode, Download, Share2, Plus, Trash2, Edit } from "lucide-react";
import { formatDate, formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

// Updated types to match backend structure
interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  status: string;
  credit?: number;
}

interface SessionResponse {
  success: boolean;
  user: SessionUser;
}

interface Plan {
  id: number;
  name: string;
  price: string;
  sessionsIncluded: number;
  duration: number;
  isActive: boolean;
}

interface Subscription {
  id: number;
  user_id: string;
  plan_id: number;
  start_date: string;
  end_date: string;
  sessions_remaining: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

interface Registration {
  id: number;
  user_id: string;
  schedule_id: number;
  registration_date: string;
  qr_code: string;
  status: string;
  notes?: string;
  class?: { 
    id: number;
    name: string;
    description?: string;
  };
  schedule?: { 
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  };
}

export default function MemberSubscriptions() {
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const queryClient = useQueryClient();

  // Fetch user session with credit
  const { data: profile } = useQuery<SessionResponse>({ 
    queryKey: ["/api/auth/session"],
    queryFn: () => apiRequest("GET", "/api/auth/session"),
  });
  
  const credit = profile?.user?.credit ?? 0;

  // Fetch all subscriptions with proper mapping
  const { data: subscriptions, isLoading: subscriptionsLoading, refetch } = useQuery<Subscription[]>({
    queryKey: ["/api/member/subscriptions"],
    queryFn: () => apiRequest("GET", "/api/member/subscriptions"),
    select: (data) => {
      // Map snake_case to camelCase for frontend
      return data.map(subscription => ({
        ...subscription,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        sessionsRemaining: subscription.sessions_remaining,
        plan: subscription.plan ? {
          ...subscription.plan,
          sessionsIncluded: subscription.plan.sessionsIncluded || 0,
        } : undefined,
      }));
    },
  });

  // Fetch registrations with proper mapping
  const { data: registrations, isLoading: registrationsLoading } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
    select: (data) => {
      return data.map(reg => ({
        ...reg,
        registrationDate: reg.registration_date,
        qrCode: reg.qr_code,
        schedule: reg.schedule ? {
          ...reg.schedule,
          dayOfWeek: reg.schedule.day_of_week,
          startTime: reg.schedule.start_time,
          endTime: reg.schedule.end_time,
        } : undefined,
      }));
    },
  });

  // Payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      toast({ title: "Payment successful!" });
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentType("cash");
      setSelectedSubscription(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Payment failed", 
        description: error.message || "Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const handleDownloadQR = () => {
    toast({ title: "QR code downloaded successfully" });
  };

  const handleShareQR = () => {
    if (navigator.share) {
      navigator.share({
        title: "Class QR Code",
        text: "Check out my class QR code",
      });
    } else {
      navigator.clipboard.writeText(selectedQR?.qrCode || "");
      toast({ title: "QR code copied to clipboard" });
    }
  };

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentType, setPaymentType] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Payment handler
  async function handlePaymentSubmit() {
    if (!selectedSubscription?.id) {
      toast({ title: "No subscription selected", description: "Please select a subscription to pay for.", variant: "destructive" });
      return;
    }
    if (!profile?.user?.id) {
      toast({ title: "User not loaded", description: "Please log in again.", variant: "destructive" });
      return;
    }
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }
    if (paymentType === "credit" && Number(paymentAmount) > credit) {
      toast({ title: "Insufficient credit", description: "You do not have enough credit.", variant: "destructive" });
      return;
    }

    setIsPaying(true);
    try {
      await createPaymentMutation.mutateAsync({
        subscription_id: selectedSubscription.id,
        user_id: profile.user.id,
        amount: Number(paymentAmount),
        payment_type: paymentType,
      });
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsPaying(false);
    }
  }

  const openPaymentDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowPaymentDialog(true);
  };

  if (subscriptionsLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeSubscriptions = subscriptions?.filter(sub => sub.status === 'active') || [];
  const inactiveSubscriptions = subscriptions?.filter(sub => sub.status !== 'active') || [];

  return (
    <div className="space-y-8">
      {/* Credit Tag at the Top */}
      <div className="flex items-center justify-end mb-4">
        <Card className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-100 to-green-50 border-green-200 shadow-none">
          <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>
            {credit} TND
          </span>
          <Badge variant={credit > 0 ? "default" : "secondary"} className="ml-2 px-2 py-1 rounded-full text-xs">
            {credit > 0 ? "Credit Available" : "No Credit"}
          </Badge>
        </Card>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Subscriptions</h1>
        <p className="text-muted-foreground">View and manage all your subscriptions</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Subscriptions List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Subscriptions */}
              {activeSubscriptions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Active Subscriptions</h2>
                  {activeSubscriptions.map((subscription) => {
                    const sessionsUsed = ((subscription.plan?.sessionsIncluded ?? 0) - (subscription as any).sessionsRemaining);
                    const totalSessions = subscription.plan?.sessionsIncluded ?? 0;
                    const usagePercentage = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;

                    return (
                      <Card key={subscription.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{subscription.plan?.name ?? "Plan"}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="default">Active</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPaymentDialog(subscription)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                            </div>
                          </CardTitle>
                          <CardDescription>Active membership details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-primary/5 rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                              <p className="text-2xl font-bold text-primary">{(subscription as any).sessionsRemaining}</p>
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

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Usage Progress</span>
                              <span className="text-sm text-muted-foreground">
                                {Math.round(usagePercentage)}% used
                              </span>
                            </div>
                            <Progress value={usagePercentage} className="h-3" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Start Date:</span>
                              <p className="font-medium">{formatDate((subscription as any).startDate)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End Date:</span>
                              <p className="font-medium">{formatDate((subscription as any).endDate)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <p className="font-medium">${subscription.plan?.price ?? 0}/month</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant="default" className="ml-1">Active</Badge>
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
                  {inactiveSubscriptions.map((subscription) => (
                    <Card key={subscription.id} className="border-l-4 border-l-muted opacity-75">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{subscription.plan?.name ?? "Plan"}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{subscription.status}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(subscription)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>Inactive membership details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Start Date:</span>
                            <p className="font-medium">{formatDate((subscription as any).startDate)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">End Date:</span>
                            <p className="font-medium">{formatDate((subscription as any).endDate)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <p className="font-medium">${subscription.plan?.price ?? 0}/month</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="secondary" className="ml-1">{subscription.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* No Subscriptions */}
              {subscriptions?.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Subscriptions</h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any subscriptions. Contact the gym to set up your membership.
                    </p>
                    <Button>Contact Support</Button>
                  </CardContent>
                </Card>
              )}

              {/* QR Codes for Registered Classes */}
              <Card>
                <CardHeader>
                  <CardTitle>My QR Codes</CardTitle>
                  <CardDescription>QR codes for your registered classes</CardDescription>
                </CardHeader>
                <CardContent>
                  {registrationsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                          <div className="w-16 h-16 bg-muted rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : registrations && registrations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {registrations.map((registration: Registration) => (
                        <Card key={registration.id} className="p-4">
                          <div className="text-center">
                            <h4 className="font-medium text-foreground mb-1">
                              {registration.class?.name ?? "Class"}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {getDayName((registration as any).schedule?.dayOfWeek ?? 0)} • {formatTime((registration as any).schedule?.startTime ?? "00:00")}
                            </p>
                            
                            <div className="w-32 h-32 mx-auto mb-3 bg-white border border-border rounded-lg p-2">
                              <QRGenerator value={(registration as any).qrCode} size={112} />
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-3">
                              {(registration as any).qrCode}
                            </p>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setSelectedQR(registration)}
                              >
                                <QrCode className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadQR}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No QR codes available</p>
                      <p className="text-sm">Register for classes to get your QR codes</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>This Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Subscriptions</span>
                    <span className="font-medium text-foreground">{activeSubscriptions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Subscriptions</span>
                    <span className="font-medium text-primary">{subscriptions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available Credit</span>
                    <span className="font-medium text-foreground">{credit} TND</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/member/classes">
                      <Calendar className="w-4 h-4 mr-2" />
                      Browse Classes
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="w-4 h-4 mr-2" />
                    View Schedule
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Fitness Goals
                  </Button>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Have questions about your subscriptions or need assistance?
                  </p>
                  <Button variant="outline" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="credit">
          <Card>
            <CardHeader>
              <CardTitle>My Credit</CardTitle>
              <CardDescription>Your available balance for payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-primary">{credit} TND</span>
                <Badge variant={credit > 0 ? "default" : "secondary"}>{credit > 0 ? "Available" : "No Credit"}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground text-sm">You can use your credit to pay for subscriptions or classes.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="sm:max-w-md">
          {/* Credit Tag at the Top of Popup */}
          <div className="flex items-center justify-end mb-4">
            <Card className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-100 to-green-50 border-green-200 shadow-none">
              <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>
                {credit} TND
              </span>
              <Badge variant={credit > 0 ? "default" : "secondary"} className="ml-2 px-2 py-1 rounded-full text-xs">
                {credit > 0 ? "Credit Available" : "No Credit"}
              </Badge>
            </Card>
          </div>
          <DialogHeader>
            <DialogTitle>Class QR Code</DialogTitle>
            <DialogDescription>
              Show this code at the gym to check in
            </DialogDescription>
          </DialogHeader>
          {selectedQR && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-foreground mb-2">
                  {selectedQR.class?.name}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {getDayName((selectedQR as any).schedule?.dayOfWeek)} • {formatTime((selectedQR as any).schedule?.startTime)}
                </p>
                <QRGenerator value={(selectedQR as any).qrCode} size={200} />
                <p className="text-sm text-muted-foreground mt-4">
                  Code: {(selectedQR as any).qrCode}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleDownloadQR}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleShareQR}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make a Payment</DialogTitle>
            <DialogDescription>
              Enter the amount you wish to pay for your subscription.<br />
              <span className="text-xs text-muted-foreground">
                If you pay more than the remaining due, the excess will be stored as credit for future use.
              </span>
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Selected Plan: {selectedSubscription.plan?.name}</p>
              <p className="text-sm text-muted-foreground">Price: ${selectedSubscription.plan?.price}/month</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <Input
                type="number"
                min="1"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="Amount"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Type</label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit" disabled={credit <= 0}>Credit ({credit} TND available)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === "credit" && (
              <div className="text-sm text-muted-foreground">You can pay up to {credit} TND from your credit.</div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isPaying}>Cancel</Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={isPaying || !paymentAmount || Number(paymentAmount) <= 0 || (paymentType === "credit" && Number(paymentAmount) > credit)}
            >
              {isPaying ? "Paying..." : "Pay"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
