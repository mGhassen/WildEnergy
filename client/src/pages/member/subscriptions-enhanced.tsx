import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Users, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/auth";

export default function MemberSubscriptionsEnhanced() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/member/subscription"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your subscription...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Wild Energy membership
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground">
                You don't have an active subscription. Contact Wild Energy to get started!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = subscription.plan ? 
    ((subscription.plan.sessionsIncluded - subscription.sessionsRemaining) / subscription.plan.sessionsIncluded) * 100 : 0;

  const isExpired = new Date(subscription.endDate) < new Date();
  const isExpiringSoon = new Date(subscription.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Wild Energy membership
        </p>
      </div>

      {/* Current Subscription */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{subscription.plan?.name}</CardTitle>
              <CardDescription className="text-lg mt-1">
                Current Plan
              </CardDescription>
            </div>
            <Badge 
              variant={subscription.status === 'active' ? 'default' : 'destructive'}
              className="text-sm"
            >
              {subscription.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Sessions Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Sessions Used</span>
              <span className="text-sm text-muted-foreground">
                {subscription.plan ? subscription.plan.sessionsIncluded - subscription.sessionsRemaining : 0} / {subscription.plan?.sessionsIncluded} sessions
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{subscription.sessionsRemaining}</span>
              <span className="text-muted-foreground ml-2">sessions remaining</span>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(subscription.startDate)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(subscription.endDate)}</p>
                  {isExpiringSoon && !isExpired && (
                    <Badge variant="outline" className="mt-1 text-orange-600 border-orange-200">
                      Expires Soon
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="destructive" className="mt-1">
                      Expired
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Plan Price</p>
                  <p className="text-sm text-muted-foreground">{subscription.plan?.price} TND</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Plan Type</p>
                  <p className="text-sm text-muted-foreground">Premium Membership</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Access to all classes</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Book classes in advance</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Cancel up to 24h before</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">QR code check-in</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Class history tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Mobile app access</span>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Tips for Your Membership</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Book your classes early to secure your spot</p>
              <p>• Cancel at least 24 hours in advance to get your session refunded</p>
              <p>• Check your QR code in the Class History section before arriving</p>
              <p>• Contact Wild Energy staff if you need assistance with your membership</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Contact Wild Energy for subscription support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Phone:</strong> +216 XX XXX XXX</p>
            <p><strong>Email:</strong> info@wildenergy.tn</p>
            <p><strong>Address:</strong> Wild Energy Studio, Tunis</p>
            <p className="text-muted-foreground mt-4">
              Our team is here to help you make the most of your Wild Energy membership.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}