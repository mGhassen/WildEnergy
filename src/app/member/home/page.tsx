"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import QRGenerator from "@/components/qr-generator";
import { Calendar, Clock, Users, MapPin, QrCode, ArrowRight, Sparkles, Crown, Star, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime, getDayName, formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useMemberCourses } from "@/hooks/useMemberCourses";
import { useMemberSubscriptions } from "@/hooks/useSubscriptions";
import { usePlans } from "@/hooks/usePlans";
import { CardSkeleton, ListSkeleton } from "@/components/skeletons";
import { Registration } from "@/lib/api/registrations";
import { Subscription } from "@/lib/api/subscriptions";
import { Plan } from "@/lib/api/plans";

// Types for member home page
interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
}

interface Class {
  id: number;
  name: string;
  category?: {
    name: string;
  };
}

interface Schedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime?: string; // Make optional if sometimes missing
}

interface Course {
  id: number;
  class: Class;
  trainer: Trainer;
  schedule: Schedule;
  courseDate?: string;
}

export default function MemberHome() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  const { data: registrations, isLoading: registrationsLoading } = useMemberRegistrations();
  const { data: courses, isLoading: coursesLoading } = useMemberCourses();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useMemberSubscriptions();
  const { data: plans, isLoading: plansLoading } = usePlans();

  // Calculate insights
  const activeSubs = Array.isArray(subscriptions) ? subscriptions.filter((s: any) => s.status === "active") : [];
  const totalSessionsRemaining = activeSubs.reduce((sum: number, s: any) => sum + (s.sessions_remaining || 0), 0);
  const totalActive = activeSubs.length;

  const registrationsArr = Array.isArray(registrations) ? registrations : [];
  const coursesArr = Array.isArray(courses) ? courses : [];
  const plansArr = Array.isArray(plans) ? plans : [];
  const currentPlan = plansArr[currentPlanIndex];

  // Debug logging
  console.log('Registrations data:', registrationsArr);
  console.log('Courses data:', coursesArr);

  // Helper function to get total sessions from plan groups
  const getTotalSessions = (plan: any) => {
    if (plan?.plan_groups && plan.plan_groups.length > 0) {
      return plan.plan_groups.reduce((total: number, group: any) => total + (group.session_count || 0), 0);
    }
    return 0;
  };

  // Auto-slide functionality with gentle animation
  useEffect(() => {
    if (plansArr.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentPlanIndex((prev) => (prev + 1) % plansArr.length);
    }, 4000); // Change plan every 4 seconds

    return () => clearInterval(interval);
  }, [plansArr.length]);

  // Filter and organize all registrations
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Get all active registrations
  const allRegistrations = registrationsArr.filter((reg: any) => {
    return reg.status === 'registered' && reg.course?.course_date;
  });

  // Separate today's registrations and upcoming ones
  const registrationsToday = allRegistrations.filter((reg: any) => {
    const courseDate = new Date(reg.course.course_date);
    return courseDate.toDateString() === today.toDateString();
  });

  const upcomingRegistrations = allRegistrations.filter((reg: any) => {
    const courseDate = new Date(reg.course.course_date);
    return courseDate > today;
  });

  // Sort upcoming registrations by date
  upcomingRegistrations.sort((a: any, b: any) => {
    return new Date(a.course.course_date).getTime() - new Date(b.course.course_date).getTime();
  });

  const nextClass = upcomingRegistrations[0];

  // Debug filtered results
  console.log('Today registrations:', registrationsToday);
  console.log('Upcoming registrations:', upcomingRegistrations);

  if (registrationsLoading || coursesLoading || subscriptionsLoading || plansLoading) {
    return (
      <div className={isMobile ? "max-w-full mx-auto p-2 space-y-4" : "max-w-6xl mx-auto p-6 space-y-8"}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
          </div>
          <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
              <CardSkeleton key={i} showImage={false} lines={4} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Welcome back!</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                  Hello, {user?.firstName || 'there'}! 👋
                </h1>
                <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
                  Ready to dance? Here's your fitness journey overview.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                  <Users className="w-16 h-16 text-white/80" />
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{totalActive}</div>
                <div className="text-sm text-white/80">Active Plans</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{totalSessionsRemaining}</div>
                <div className="text-sm text-white/80">Sessions Left</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{registrationsToday.length}</div>
                <div className="text-sm text-white/80">Today's Classes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{upcomingRegistrations.length}</div>
                <div className="text-sm text-white/80">Upcoming</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Today's Classes - Hero Section */}
            {registrationsToday.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 text-white shadow-2xl">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Today's Schedule</span>
                      </div>
                      <h2 className="text-3xl font-bold mb-2">Your Classes Today</h2>
                      <p className="text-white/90">Don't miss your scheduled sessions!</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{registrationsToday.length}</div>
                      <div className="text-sm text-white/80">Classes</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {registrationsToday.map((reg: any) => (
                      <div key={reg.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                              <span className="text-white font-bold text-xl">
                                {reg.course?.class?.category?.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold mb-2">{reg.course?.class?.name}</h3>
                              <div className="flex items-center gap-6 text-white/90">
                                <span className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(reg.course?.start_time)} - {formatTime(reg.course?.end_time || reg.course?.start_time)}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {reg.course?.trainer?.user?.first_name} {reg.course?.trainer?.user?.last_name}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => setSelectedQR(reg)}
                            className="bg-white text-orange-600 hover:bg-white/90 font-semibold px-6 py-3 rounded-xl"
                          >
                            <QrCode className="w-5 h-5 mr-2" />
                            Show QR
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Classes */}
            {upcomingRegistrations.length > 0 && (
              <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-card to-muted/30 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Upcoming Classes</h2>
                      <p className="text-muted-foreground">Your scheduled sessions ahead</p>
                    </div>
                    <div className="ml-auto">
                      <Badge variant="secondary" className="bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">
                        {upcomingRegistrations.length} classes
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {upcomingRegistrations.map((registration: any) => (
                      <div key={registration.id} className="group flex items-center justify-between p-4 border border-border rounded-2xl hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-gradient-to-r from-card to-muted/20">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-primary font-bold text-lg">
                              {registration.course?.class?.category?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-lg mb-2">{registration.course?.class?.name}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {registration.course?.course_date ? formatDate(registration.course.course_date) : 'Date TBD'}
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {formatTime(registration.course?.start_time)}
                              </span>
                              <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {registration.course?.trainer?.user?.first_name} {registration.course?.trainer?.user?.last_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => setSelectedQR(registration)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl px-6 py-3"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR Code
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Classes State */}
            {allRegistrations.length === 0 && (
              <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-br from-card to-muted/30 p-12 text-center">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">No classes booked yet</h3>
                  <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                    Start your fitness journey by booking your first class. We have amazing sessions waiting for you!
                  </p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-semibold" asChild>
                    <a href="/member/classes">
                      <Calendar className="w-5 h-5 mr-2" />
                      Browse All Classes
                    </a>
                  </Button>
                </div>
              </Card>
            )}
        </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Available Plans */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Premium Plans</h3>
                    <p className="text-white/90 text-sm">Unlock your potential</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                {plansLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-muted rounded-2xl"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                ) : plansArr.length > 0 ? (
                  <div className="space-y-6">
                    {/* Featured Plan */}
                    <div className="relative">
                      <div 
                        key={currentPlanIndex}
                        className="p-6 bg-gradient-to-br from-card to-muted/20 rounded-2xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-500"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-bold text-foreground text-lg">{currentPlan.name}</h4>
                                {currentPlan.is_popular && (
                                  <Badge className="bg-orange-500 text-white px-3 py-1 text-xs font-semibold">
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                                {currentPlan.is_premium && (
                                  <Badge className="bg-purple-500 text-white px-3 py-1 text-xs font-semibold">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">{currentPlan.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Zap className="w-4 h-4" />
                                {getTotalSessions(currentPlan)} sessions
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {currentPlan.duration_days} days duration
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">{formatCurrency(currentPlan.price)}</p>
                              <p className="text-xs text-muted-foreground">per month</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Plan Indicators */}
                    {plansArr.length > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        {plansArr.map((_, index) => (
                          <div
                            key={index}
                            className={`transition-all duration-500 ${
                              index === currentPlanIndex
                                ? 'w-3 h-3 bg-primary rounded-full'
                                : 'w-2 h-2 bg-muted rounded-full'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <Button className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-3 rounded-2xl" asChild>
                      <a href="/member/plans">
                        View All Plans
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No plans available</p>
                    <Button size="sm" variant="outline" asChild>
                      <a href="/member/plans">Check Plans</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-card to-muted/30 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Quick Actions</h3>
                    <p className="text-muted-foreground text-sm">Get started quickly</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-3">
                <Button variant="outline" className="w-full justify-start h-14 text-sm rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" asChild>
                  <a href="/member/classes">
                    <Calendar className="w-5 h-5 mr-3" />
                    Browse Classes
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start h-14 text-sm rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" asChild>
                  <a href="/member/history">
                    <Clock className="w-5 h-5 mr-3" />
                    Class History
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start h-14 text-sm rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" asChild>
                  <a href="/member/subscriptions">
                    <MapPin className="w-5 h-5 mr-3" />
                    My Subscriptions
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Gym Info */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Wild Energy Gym</h3>
                    <p className="text-white/90 text-sm">Tunis, Tunisia</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-card to-muted/20 rounded-2xl">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Open Today</p>
                      <p className="text-sm text-muted-foreground">6:00 AM - 10:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-card to-muted/20 rounded-2xl">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Contact</p>
                      <p className="text-sm text-muted-foreground">+216 XX XXX XXX</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-center pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">Class QR Code</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Show this code at the gym to check in
            </DialogDescription>
          </DialogHeader>
          {selectedQR && (
            <div className="space-y-4 sm:space-y-6">
              {/* Class Information */}
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full">
                  <span className="text-primary font-semibold text-sm">
                    {selectedQR.course?.class?.category?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-foreground">
                  {selectedQR.course?.class?.name}
                </h4>
                <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    {selectedQR.course?.course_date ? formatDate(selectedQR.course.course_date) : 'Date TBD'}
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    {formatTime(selectedQR.course?.start_time)} - {formatTime(selectedQR.course?.end_time || selectedQR.course?.start_time)}
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    {selectedQR.course?.trainer?.user?.first_name} {selectedQR.course?.trainer?.user?.last_name}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                <div className="p-2 sm:p-3 bg-white rounded-xl shadow-lg border-2 border-border">
                  <QRGenerator value={selectedQR.qr_code || ''} size={200} />
                </div>
                <div className="text-center space-y-2 w-full">
                  <p className="text-xs sm:text-sm font-medium text-foreground">QR Code</p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded break-all">
                    {selectedQR.qr_code || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Present this QR code to the instructor when you arrive for your class
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <QrCode className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Scan at the gym entrance</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gentle CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out;
        }
      `}</style>
      </div>
    </div>
  );
} 