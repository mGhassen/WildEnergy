import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, Users, MapPin, QrCode, ArrowRight, Sparkles } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MemberHome() {
  const { user } = useAuth();
  const [selectedQR, setSelectedQR] = useState<any>(null);

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const { data: schedules } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/member/subscriptions"],
  });

  // Calculate insights
  const activeSubs = Array.isArray(subscriptions) ? subscriptions.filter((s: any) => s.status === "active") : [];
  const totalSessionsRemaining = activeSubs.reduce((sum: number, s: any) => sum + (s.sessions_remaining || 0), 0);
  const totalActive = activeSubs.length;

  const registrationsArr = Array.isArray(registrations) ? registrations : [];
  const schedulesArr = Array.isArray(schedules) ? schedules : [];

  const upcomingRegistrations = registrationsArr.filter((reg: any) => {
    const today = new Date();
    const classDate = new Date();
    classDate.setDate(today.getDate() + (reg.schedule?.dayOfWeek - today.getDay() + 7) % 7);
    return classDate >= today;
  });

  const todayClasses = schedulesArr.filter((schedule: any) => {
    const today = new Date().getDay();
    return schedule.dayOfWeek === today;
  });

  const nextClass = upcomingRegistrations[0];

  if (registrationsLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Welcome back!</span>
        </div>
        <h1 className="text-4xl font-bold text-foreground">
          Hello, {user?.firstName || 'there'}! 👋
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Ready for your next workout? Here's what's happening today and this week.
        </p>
      </div>

      {/* Next Class Highlight */}
      {nextClass && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    Next Class
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getDayName(nextClass.schedule?.dayOfWeek)} • {formatTime(nextClass.schedule?.startTime)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {nextClass.class?.name}
                </h3>
                <p className="text-muted-foreground">
                  with {nextClass.trainer?.firstName} {nextClass.trainer?.lastName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedQR(nextClass)}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button asChild>
                  <a href="/member/classes">
                    View All Classes
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Insights Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
            <Card>
              <CardContent className="p-6 flex items-center gap-4 h-full">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-foreground">{totalActive}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4 h-full">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Badge className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessions Remaining</p>
                  <p className="text-2xl font-bold text-foreground">{totalSessionsRemaining}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                Classes available today at your gym
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayClasses.length > 0 ? (
                <div className="space-y-4">
                  {todayClasses.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {schedule.class?.category?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{schedule.class?.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {schedule.class?.maxCapacity} spots
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/member/classes">
                          Join
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No classes today</h3>
                  <p className="text-sm mb-4">Take a rest day or check out tomorrow's schedule</p>
                  <Button variant="outline" asChild>
                    <a href="/member/classes">
                      Browse All Classes
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          {upcomingRegistrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Your Upcoming Classes
                </CardTitle>
                <CardDescription>
                  Classes you're registered for this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingRegistrations.slice(0, 3).map((registration: any) => (
                    <div key={registration.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {registration.class?.category?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{registration.class?.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {getDayName(registration.schedule?.dayOfWeek)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(registration.schedule?.startTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {registration.trainer?.firstName} {registration.trainer?.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedQR(registration)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR
                      </Button>
                    </div>
                  ))}
                </div>
                {upcomingRegistrations.length > 3 && (
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="ghost" className="w-full" asChild>
                      <a href="/member/classes">
                        View All {upcomingRegistrations.length} Classes
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/member/classes">
                  <Calendar className="w-4 h-4 mr-3" />
                  Browse Classes
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/member/history">
                  <Clock className="w-4 h-4 mr-3" />
                  Class History
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/member/subscriptions">
                  <MapPin className="w-4 h-4 mr-3" />
                  My Subscriptions
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Gym Info */}
          <Card>
            <CardHeader>
              <CardTitle>Gym Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Wild Energy Gym</p>
                  <p className="text-xs text-muted-foreground">Tunis, Tunisia</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open Today:</span>
                  <span className="font-medium">6:00 AM - 10:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">+216 XX XXX XXX</span>
                </div>
              </div>
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