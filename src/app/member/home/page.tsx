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
  const [tab, setTab] = useState<'today' | 'upcoming'>('today');
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

  // Filter registrations for today and upcoming (next 7 days)
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7); // 7 days from today
  
  const upcomingRegistrations = registrationsArr.filter((reg: any) => {
    if (reg.status !== 'registered' || !reg.course?.course_date) return false;
    const courseDate = new Date(reg.course.course_date);
    return courseDate >= today && courseDate <= nextWeek;
  });

  const registrationsToday = registrationsArr.filter((reg: any) => {
    if (reg.status !== 'registered' || !reg.course?.course_date) return false;
    const courseDate = new Date(reg.course.course_date);
    return courseDate.toDateString() === today.toDateString();
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
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Welcome back!</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Hello, {user?.firstName || 'there'}! 👋
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Ready for your next workout? Here's what's happening today and this week.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Insights Section */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3 h-full">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Active Subscriptions</p>
                  <p className="text-xl font-bold text-foreground">{totalActive}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3 h-full">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Badge className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Sessions Remaining</p>
                  <p className="text-xl font-bold text-foreground">{totalSessionsRemaining}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Card with Enhanced Tabs */}
          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground">My Classes This Week</h2>
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 w-full sm:w-fit mx-auto mb-3 shadow-sm">
                <Button
                  variant={tab === 'today' ? 'default' : 'ghost'}
                  onClick={() => setTab('today')}
                  className={`flex-1 sm:flex-none rounded-full px-4 py-2 flex items-center justify-center gap-2 transition-all text-sm ${tab === 'today' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Today</span>
                  <span className="sm:hidden">Today</span>
                </Button>
                <Button
                  variant={tab === 'upcoming' ? 'default' : 'ghost'}
                  onClick={() => setTab('upcoming')}
                  className={`flex-1 sm:flex-none rounded-full px-4 py-2 flex items-center justify-center gap-2 transition-all text-sm ${tab === 'upcoming' ? 'shadow bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Next 7 Days</span>
                  <span className="sm:hidden">7 Days</span>
                </Button>
              </div>
              <CardDescription className="text-center text-sm">
                {tab === 'today'
                  ? 'Your booked classes for today'
                  : "Classes you're registered for in the next 7 days"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tab === 'today' ? (
                registrationsToday.length > 0 ? (
                  <div className="space-y-3">
                    {registrationsToday.map((reg: any) => (
                      <div key={reg.id} className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-xs sm:text-sm">
                              {reg.course?.class?.category?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{reg.course?.class?.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{formatTime(reg.course?.start_time)} - {formatTime(reg.course?.end_time || reg.course?.start_time)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{reg.course?.trainer?.user?.first_name} {reg.course?.trainer?.user?.last_name}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQR(reg)}
                          className="flex-shrink-0 ml-2"
                        >
                          <QrCode className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">QR</span>
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
                  <div className="space-y-3">
                    {upcomingRegistrations.map((registration: any) => (
                      <div key={registration.id} className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs sm:text-sm font-medium">
                              {registration.course?.class?.category?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{registration.course?.class?.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{registration.course?.course_date ? formatDate(registration.course.course_date) : 'Date TBD'}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{formatTime(registration.course?.start_time)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{registration.course?.trainer?.user?.first_name} {registration.course?.trainer?.user?.last_name}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQR(registration)}
                          className="flex-shrink-0 ml-2"
                        >
                          <QrCode className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">QR</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Clock className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No classes booked for the next 7 days</h3>
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
        <div className="space-y-4 lg:space-y-6">
          {/* Available Plans */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Available Plans</CardTitle>
              </div>
              <CardDescription className="text-sm">Discover our Pole Dance plans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plansLoading ? (
                <div className="animate-pulse">
                  <div className="h-32 bg-muted rounded-lg"></div>
                </div>
              ) : plansArr.length > 0 ? (
                <div className="space-y-4">
                  {/* Plan Card with Gentle Fade Animation */}
                  <div className="relative">
                    <div 
                      key={currentPlanIndex}
                      className="p-3 sm:p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-all duration-700 ease-out animate-fadeIn"
                      style={{
                        animation: 'fadeIn 0.7s ease-out'
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">{currentPlan.name}</h4>
                              {currentPlan.is_popular && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 flex-shrink-0">
                                  <Star className="w-3 h-3 mr-1" />
                                  Popular
                                </Badge>
                              )}
                              {currentPlan.is_premium && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 flex-shrink-0">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{currentPlan.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                              {getTotalSessions(currentPlan)} sessions
                            </span>
                            <span>{currentPlan.duration_days} days</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg sm:text-xl font-bold text-foreground">{formatCurrency(currentPlan.price)}</p>
                            <p className="text-xs text-muted-foreground">per month</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gentle Dot Indicators */}
                  {plansArr.length > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      {plansArr.map((_, index) => (
                        <div
                          key={index}
                          className={`transition-all duration-700 ease-out ${
                            index === currentPlanIndex
                              ? 'w-3 h-3 bg-primary rounded-full'
                              : 'w-2 h-2 bg-muted rounded-full'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <Button variant="outline" className="w-full" asChild>
                    <a href="/member/plans">
                      View All Plans
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No plans available</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/member/plans">Check Plans</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions - Hidden on mobile */}
          <Card className="hidden lg:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription className="text-sm">Get started quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start h-12 text-sm" asChild>
                <a href="/member/classes">
                  <Calendar className="w-4 h-4 mr-3" />
                  Browse Classes
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-sm" asChild>
                <a href="/member/history">
                  <Clock className="w-4 h-4 mr-3" />
                  Class History
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-sm" asChild>
                <a href="/member/subscriptions">
                  <MapPin className="w-4 h-4 mr-3" />
                  My Subscriptions
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Gym Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gym Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Wild Energy Gym</p>
                  <p className="text-xs text-muted-foreground">Tunis, Tunisia</p>
                </div>
              </div>
              <div className="space-y-2 text-xs sm:text-sm">
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
  );
} 