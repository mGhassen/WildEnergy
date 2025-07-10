import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, Target, Star, QrCode, Download, Share2 } from "lucide-react";
import { formatDate, formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function MemberSubscriptions() {
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const { toast } = useToast();
  // Add state for tabs
  const [tab, setTab] = useState("overview");
  // Fetch user credit (assume it's part of the subscription or fetch separately)
  const { data: profile } = useQuery({ queryKey: ["/api/auth/session"] });
  const credit = profile?.user?.credit ?? 0;

  const { data: subscription, isLoading: subscriptionLoading, refetch } = useQuery({
    queryKey: ["/api/member/subscription"],
  });

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/registrations"],
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

  // Payment handler
  async function handlePaymentSubmit() {
    if (!subscription?.id) {
      toast({ title: "No active subscription", description: "You must have an active subscription to pay.", variant: "destructive" });
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
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          userId: profile.user.id,
          amount: Number(paymentAmount),
          paymentType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Payment successful!" });
        setShowPaymentDialog(false);
        setPaymentAmount("");
        setPaymentType("cash");
        await refetch();
      } else {
        toast({ title: "Payment failed", description: data.error || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Payment failed", description: (e as any)?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  }

  if (subscriptionLoading) {
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

  const sessionsUsed = subscription ? (subscription.plan?.sessionsIncluded - subscription.sessionsRemaining) : 0;
  const totalSessions = subscription?.plan?.sessionsIncluded || 0;
  const usagePercentage = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Subscriptions</h1>
        <p className="text-muted-foreground">View and manage your active subscriptions</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Subscription */}
            <div className="lg:col-span-2 space-y-6">
              {subscription ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Current Plan</span>
                      <Badge variant="default">Active</Badge>
                    </CardTitle>
                    <CardDescription>Your active membership details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-primary mb-2">{subscription.plan?.name}</h3>
                      <p className="text-lg font-semibold text-foreground">
                        ${subscription.plan?.price}/month
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {subscription.plan?.sessionsIncluded} sessions included
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                        <p className="text-2xl font-bold text-primary">{subscription.sessionsRemaining}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Sessions Used</p>
                        <p className="text-2xl font-bold text-foreground">{sessionsUsed}</p>
                      </div>
                      <div className="text-center">
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

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Start Date</span>
                        <span className="text-sm font-medium">{formatDate(subscription.startDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">End Date</span>
                        <span className="text-sm font-medium">{formatDate(subscription.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Auto Renewal</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1">
                        Manage Billing
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Update Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Active Subscription</h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have an active subscription. Contact the gym to set up your membership.
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
                      {registrations.map((registration: any) => (
                        <Card key={registration.id} className="p-4">
                          <div className="text-center">
                            <h4 className="font-medium text-foreground mb-1">
                              {registration.class?.name}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {getDayName(registration.schedule?.dayOfWeek)} • {formatTime(registration.schedule?.startTime)}
                            </p>
                            
                            <div className="w-32 h-32 mx-auto mb-3 bg-white border border-border rounded-lg p-2">
                              <QRGenerator value={registration.qrCode} size={112} />
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-3">
                              {registration.qrCode}
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
                    <span className="text-sm text-muted-foreground">Classes Attended</span>
                    <span className="font-medium text-foreground">{sessionsUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Classes Remaining</span>
                    <span className="font-medium text-primary">{subscription?.sessionsRemaining || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Streak</span>
                    <span className="font-medium text-foreground">5 days</span>
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
                    Have questions about your subscription or need assistance?
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
                  {getDayName(selectedQR.schedule?.dayOfWeek)} • {formatTime(selectedQR.schedule?.startTime)}
                </p>
                <QRGenerator value={selectedQR.qrCode} size={200} />
                <p className="text-sm text-muted-foreground mt-4">
                  Code: {selectedQR.qrCode}
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

      <Button className="mt-4" onClick={() => setShowPaymentDialog(true)}>
        Add Payment
      </Button>
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
                  <SelectItem value="credit" disabled={credit <= 0}>Credit ({credit} TND available)</SelectItem>
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
