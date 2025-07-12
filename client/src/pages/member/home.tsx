import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Calendar, TrendingUp, Target, Award, Users } from "lucide-react";
import { formatDate, formatTime, getDayName } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import MemberLayout from "@/components/layout/member-layout";

export default function MemberHome() {
  const { profile } = useAuth();
  const [selectedQR, setSelectedQR] = useState<any>(null);

  // Fetch all subscriptions
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/member/subscriptions"],
  });

  // Fetch registrations
  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/registrations"],
  });

  // Fetch schedules
  const { data: schedules } = useQuery({
    queryKey: ["/api/schedules"],
  });

  // Credit
  const credit = profile?.credit ?? 0;

  // Stats
  const activeSubs = subscriptions?.filter((s: any) => s.status === "active") || [];
  const totalSessionsRemaining = activeSubs.reduce((sum: number, s: any) => sum + (s.sessions_remaining || 0), 0);
  const totalActive = activeSubs.length;
  const nextClass = registrations?.find((reg: any) => {
    const today = new Date();
    const classDate = new Date();
    classDate.setDate(today.getDate() + ((reg.schedule?.day_of_week - today.getDay() + 7) % 7));
    return classDate >= today;
  });
  const streak = 5; // Placeholder

  // Upcoming classes
  const upcomingRegistrations = registrations?.filter((reg: any) => {
    const today = new Date();
    const classDate = new Date();
    classDate.setDate(today.getDate() + ((reg.schedule?.day_of_week - today.getDay() + 7) % 7));
    return classDate >= today;
  }) || [];

  // Today's schedule
  const todayClasses = schedules?.filter((schedule: any) => {
    const today = new Date().getDay();
    return schedule.day_of_week === today;
  }) || [];

  return (
    <MemberLayout>
      <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome, {profile?.firstName}!</h1>
            <p className="text-muted-foreground">Your fitness at a glance</p>
          </div>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Target className="w-6 h-6 text-primary" /><div><p className="text-sm text-muted-foreground">Active Subscriptions</p><p className="text-2xl font-bold">{totalActive}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Users className="w-6 h-6 text-primary" /><div><p className="text-sm text-muted-foreground">Sessions Remaining</p><p className="text-2xl font-bold">{totalSessionsRemaining}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Calendar className="w-6 h-6 text-primary" /><div><p className="text-sm text-muted-foreground">Next Class</p><p className="text-2xl font-bold">{nextClass ? getDayName(nextClass.schedule?.day_of_week) : '-'}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-primary" /><div><p className="text-sm text-muted-foreground">Current Streak</p><p className="text-2xl font-bold">{streak}</p></div></div></CardContent></Card>
        </div>

        {/* Subscriptions Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">My Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptionsLoading ? (
              <div>Loading subscriptions...</div>
            ) : subscriptions?.length > 0 ? (
              subscriptions.map((sub: any) => (
                <Card key={sub.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{sub.plan?.name ?? "Plan"}</span>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge>
                    </CardTitle>
                    <CardDescription>{sub.plan?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-4 text-sm">
                      <div><span className="text-muted-foreground">Sessions:</span> <span className="font-medium">{sub.sessions_remaining}</span></div>
                      <div><span className="text-muted-foreground">Start:</span> <span className="font-medium">{formatDate(sub.start_date)}</span></div>
                      <div><span className="text-muted-foreground">End:</span> <span className="font-medium">{formatDate(sub.end_date)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-muted-foreground">No subscriptions found.</div>
            )}
          </div>
        </div>

        {/* Upcoming Classes Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Classes</h2>
          <Card>
            <CardContent>
              {registrationsLoading ? (
                <div>Loading classes...</div>
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
                            {getDayName(registration.schedule?.day_of_week)} • {formatTime(registration.schedule?.start_time)} - {formatTime(registration.schedule?.end_time)}
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

        {/* Today's Schedule & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {schedule.class?.max_capacity} spots
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">No classes today.</div>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4 justify-between">
            <Button asChild className="w-full" variant="default">
              <a href="/member/classes">Browse Classes</a>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <a href="/plans">View Plans</a>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <a href="mailto:info@gym.com?subject=Support Request">Contact Support</a>
            </Button>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
} 