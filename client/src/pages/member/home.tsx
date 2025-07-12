import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, Users, MapPin, QrCode, ArrowRight, Sparkles } from "lucide-react";
import { formatTime, getDayName, formatDate } from "@/lib/auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MemberHome() {
  const { user } = useAuth();
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [tab, setTab] = useState<'today' | 'upcoming'>('today');

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
    classDate.setDate(today.getDate() + (reg.course?.schedule?.dayOfWeek - today.getDay() + 7) % 7);
    return classDate >= today && reg.status === 'registered';
  });

  const todayDay = new Date().getDay();
  const registrationsToday = registrationsArr.filter((reg: any) => 
    reg.course?.schedule?.dayOfWeek === todayDay && reg.status === 'registered'
  );

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
      {/* {nextClass && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    Next Class
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getDayName(nextClass.course?.schedule?.dayOfWeek)} • {formatTime(nextClass.course?.schedule?.startTime)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {nextClass.course?.class?.name}
                </h3>
                <p className="text-muted-foreground">
                  with {nextClass.course?.trainer?.firstName} {nextClass.course?.trainer?.lastName}
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
      )} */}

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

          {/* Combined Card with Enhanced Tabs */}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold mb-2 text-foreground">My Classes This Week</h2>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full p-1 w-fit mx-auto mb-2 shadow-sm">
                <Button
                  variant={tab === 'today' ? 'default' : 'ghost'}
                  onClick={() => setTab('today')}
                  className={`rounded-full px-5 py-2 flex items-center gap-2 transition-all ${tab === 'today' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Today
                </Button>
                <Button
                  variant={tab === 'upcoming' ? 'default' : 'ghost'}
                  onClick={() => setTab('upcoming')}
                  className={`rounded-full px-5 py-2 flex items-center gap-2 transition-all ${tab === 'upcoming' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Upcoming
                </Button>
              </div>
              <CardDescription className="text-center text-base mt-2">
                {tab === 'today'
                  ? 'Your booked classes for today'
                  : "Classes you're registered for this week"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tab === 'today' ? (
                registrationsToday.length > 0 ? (
                  <div className="space-y-4">
                    {registrationsToday.map((reg: any) => (
                      <div key={reg.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {reg.course?.class?.category?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{reg.course?.class?.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(reg.course?.schedule?.startTime)} - {formatTime(reg.course?.schedule?.endTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {reg.course?.trainer?.firstName} {reg.course?.trainer?.lastName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQR(reg)}
                        >
                          <QrCode className="w-4 h-4 mr-1" />
                          QR
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Calendar className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No classes booked for today</h3>
                    <p className="text-base mb-4">Book a class to see it here</p>
                    <Button variant="outline" asChild>
                      <a href="/member/classes">
                        Browse All Classes
                      </a>
                    </Button>
                  </div>
                )
              ) : (
                upcomingRegistrations.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingRegistrations.map((registration: any) => (
                      <div key={registration.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {registration.course?.class?.category?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{registration.course?.class?.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {registration.course?.courseDate ? formatDate(registration.course.courseDate) : getDayName(registration.course?.schedule?.dayOfWeek)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(registration.course?.schedule?.startTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {registration.course?.trainer?.firstName} {registration.course?.trainer?.lastName}
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
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Clock className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No upcoming classes booked</h3>
                    <p className="text-base mb-4">Book a class to see it here</p>
                    <Button variant="outline" asChild>
                      <a href="/member/classes">
                        Browse All Classes
                      </a>
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
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
                  {selectedQR.course?.class?.name}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {selectedQR.course?.courseDate ? formatDate(selectedQR.course.courseDate) : getDayName(selectedQR.course?.schedule?.dayOfWeek)} • {formatTime(selectedQR.course?.schedule?.startTime)}
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