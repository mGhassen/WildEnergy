import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, TrendingUp, Target, Award, QrCode } from "lucide-react";
import { formatDate, formatTime, getDayName } from "@/lib/auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const [selectedQR, setSelectedQR] = useState<any>(null);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/member/subscription"],
  });

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const { data: schedules } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const upcomingRegistrations = registrations?.filter((reg: any) => {
    const today = new Date();
    const classDate = new Date();
    classDate.setDate(today.getDate() + (reg.schedule?.dayOfWeek - today.getDay() + 7) % 7);
    return classDate >= today;
  }) || [];

  const todayClasses = schedules?.filter((schedule: any) => {
    const today = new Date().getDay();
    return schedule.dayOfWeek === today;
  }) || [];

  const stats = {
    sessionsUsed: subscription ? (subscription.plan?.sessionsIncluded - subscription.sessionsRemaining) : 0,
    totalSessions: subscription?.plan?.sessionsIncluded || 0,
    weeklyClasses: upcomingRegistrations.length,
    streak: 5, // Mock data for demo
  };

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

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {profile?.firstName}!
        </h1>
        <p className="text-muted-foreground">Here's your fitness overview for today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                <p className="text-3xl font-bold text-foreground">{subscription?.sessionsRemaining || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-muted-foreground">
                  {stats.sessionsUsed}/{stats.totalSessions} used
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${stats.totalSessions > 0 ? (stats.sessionsUsed / stats.totalSessions) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes This Week</p>
                <p className="text-3xl font-bold text-foreground">{stats.weeklyClasses}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold text-foreground">{stats.streak}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm text-muted-foreground">days in a row</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your active membership details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-primary text-lg">{subscription.plan?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {subscription.plan?.sessionsIncluded} sessions included
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{subscription.sessionsRemaining}</p>
                      <p className="text-sm text-muted-foreground">sessions left</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                    <span>Expires: {formatDate(subscription.endDate)}</span>
                    <span>Auto-renewal: ON</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Your Upcoming Classes</CardTitle>
              <CardDescription>Classes you're registered for</CardDescription>
            </CardHeader>
            <CardContent>
              {registrationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {upcomingRegistrations.slice(0, 3).map((registration: any) => (
                    <div key={registration.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {registration.class?.category?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{registration.class?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDayName(registration.schedule?.dayOfWeek)} • {formatTime(registration.schedule?.startTime)} - {formatTime(registration.schedule?.endTime)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            with {registration.trainer?.firstName} {registration.trainer?.lastName}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedQR(registration)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR Code
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming classes</p>
                  <p className="text-sm">Browse available classes to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Classes available today</CardDescription>
            </CardHeader>
            <CardContent>
              {todayClasses.length > 0 ? (
                <div className="space-y-3">
                  {todayClasses.slice(0, 3).map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{schedule.class?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {schedule.class?.maxCapacity} spots
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
              )}
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
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/member/subscriptions">
                  <Target className="w-4 h-4 mr-2" />
                  View Subscription
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
