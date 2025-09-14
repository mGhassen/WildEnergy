"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  QrCode, 
  User, 
  Clock, 
  MapPin, 
  Users, 
  Activity,
  Home,
  CreditCard,
  Settings,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMemberCourses } from "@/hooks/useMemberCourses";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useMemberSubscription } from "@/hooks/useMemberSubscriptions";
import { Course } from "@/lib/api/courses";
import { registrationApi } from "@/lib/api/registrations";
import { MobileAppSkeleton } from "@/components/skeletons";
import { formatTime, formatDateTime } from "@/lib/date";
import QRGenerator from "@/components/qr-generator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { MobileAppSidebar } from "@/components/mobile-app-sidebar";


interface Registration {
  id: number;
  registrationDate: string;
  qr_code: string;
  status: string;
  course: Course;
}

interface Subscription {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  sessionsRemaining: number;
  plan: {
    id: number;
    name: string;
    sessionsIncluded: number;
    price: number;
  };
}

export default function MobileApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Listen for tab changes from sidebar
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('mobileTabChange', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('mobileTabChange', handleTabChange as EventListener);
    };
  }, []);

  // Queries
  const { data: courses = [], isLoading: coursesLoading } = useMemberCourses();
  const { data: registrations = [], isLoading: registrationsLoading } = useMemberRegistrations();
  const { data: subscription, isLoading: subscriptionLoading } = useMemberSubscription();

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return registrationApi.createRegistration({ 
        user_id: user?.id || '', 
        class_id: courseId, 
        course_id: courseId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/subscription'] });
      toast({
        title: "Registered successfully",
        description: "You have been registered for the class"
      });
    }
  });

  // Show loading state
  if (coursesLoading || registrationsLoading || subscriptionLoading) {
    return <MobileAppSkeleton />;
  }

  // Get today's and upcoming courses
  const today = new Date();
  const todayCourses = courses.filter((course: Course) => {
    const courseDate = new Date(course.course_date || course.courseDate || '');
    return courseDate.toDateString() === today.toDateString();
  });

  const upcomingCourses = courses.filter((course: Course) => {
    const courseDate = new Date(course.course_date || course.courseDate || '');
    return courseDate > today;
  }).slice(0, 5);

  const isRegistered = (courseId: number) => {
    return registrations.some((reg: any) => reg.course?.id === courseId);
  };

  const getRegistrationQR = (courseId: number) => {
    const reg = registrations.find((reg: any) => reg.course?.id === courseId);
    return (reg as any)?.qr_code;
  };

  // History filtering logic
  const getFilteredRegistrations = () => {
    if (historyFilter === "all") return registrations;
    
    return registrations.filter((reg: any) => {
      switch (historyFilter) {
        case "attended":
          return reg.status === "attended";
        case "registered":
          return reg.status === "registered";
        case "cancelled":
          return reg.status === "cancelled";
        case "absent":
          return reg.status === "absent";
        default:
          return true;
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'registered':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'absent':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return <Badge variant="default" className="bg-green-100 text-green-800">Attended</Badge>;
      case 'registered':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Registered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'absent':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleRegister = (courseId: number) => {
    // Find the course to check capacity
    const course = courses?.find((c: Course) => c.id === courseId);
    
    // Check if course is full
    if (course && course.max_participants > 0 && course.current_participants >= course.max_participants) {
      toast({
        title: "Course is full",
        description: "This course has reached its maximum capacity.",
        variant: "destructive",
      });
      return;
    }
    
    if (!subscription || (subscription as any).sessionsRemaining <= 0) {
      toast({
        title: "No sessions remaining",
        description: "Please purchase a subscription to register for classes",
        variant: "destructive"
      });
      return;
    }
    registerMutation.mutate(courseId);
  };

  const HomeTab = () => (
    <div className="space-y-4 p-4">
      {/* Welcome Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Welcome back!</h2>
              <p className="text-sm text-muted-foreground">Ready for your workout?</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Your Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{(subscription as any).plan?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(subscription as any).sessionsRemaining} sessions remaining
                </p>
              </div>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Classes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {todayCourses.length > 0 ? (
            <div className="space-y-2">
              {todayCourses.map(course => (
                <div key={course.id} 
                     className="flex items-center justify-between p-3 bg-muted rounded-lg"
                     onClick={() => setSelectedCourse(course)}>
                  <div>
                    <p className="font-medium">{course.class?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(course.start_time || course.startTime)} - {formatTime(course.end_time || course.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      with {course.trainer?.user?.first_name} {course.trainer?.user?.last_name}
                    </p>
                  </div>
                  {isRegistered(course.id) ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQRCode(getRegistrationQR(course.id) || "");
                      }}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegister(course.id);
                      }}
                      disabled={registerMutation.isPending}
                    >
                      Register
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No classes scheduled for today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => setActiveTab("classes")}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-sm">Browse Classes</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex-col gap-2"
          onClick={() => setActiveTab("bookings")}
        >
          <Activity className="w-6 h-6" />
          <span className="text-sm">My Bookings</span>
        </Button>
      </div>
    </div>
  );

  const ClassesTab = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Classes</h2>
      </div>

      <div className="space-y-3">
        {upcomingCourses.map(course => (
          <Card key={course.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{course.class?.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {course.trainer?.user?.first_name} {course.trainer?.user?.last_name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {course.class?.category?.name}
                  </Badge>
                </div>
                {isRegistered(course.id) ? (
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="default">Registered</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowQRCode(getRegistrationQR(course.id) || "")}
                    >
                      <QrCode className="w-4 h-4 mr-1" />
                      QR Code
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleRegister(course.id)}
                    disabled={registerMutation.isPending}
                    size="sm"
                  >
                    Register
                  </Button>
                )}
              </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(course.course_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatTime(course.start_time)} - {formatTime(course.end_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{course.current_participants}/{course.max_participants} people</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span>{course.status}</span>
                </div>
              </div>

              <Button 
                variant="ghost" 
                className="w-full mt-3 justify-start text-left"
                onClick={() => setSelectedCourse(course)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const BookingsTab = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Bookings</h2>
      </div>

      <div className="space-y-3">
        {registrations.map(registration => (
          <Card key={registration.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{(registration as any).course?.class?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(registration as any).course?.trainer?.user?.first_name} {(registration as any).course?.trainer?.user?.last_name}
                  </p>
                </div>
                <Badge variant={registration.status === "registered" ? "default" : "secondary"}>
                  {registration.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate((registration as any).course?.course_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatTime((registration as any).course?.start_time)}</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowQRCode((registration as any).qr_code)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code for Check-in
              </Button>
            </CardContent>
          </Card>
        ))}

        {registrations.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No bookings yet</p>
              <Button 
                className="mt-3"
                onClick={() => setActiveTab("classes")}
              >
                Browse Classes
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const HistoryTab = () => {
    const filteredRegistrations = getFilteredRegistrations();
    
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Class History</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="attended">Attended</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Attended</p>
                <p className="text-lg font-bold text-green-600">
                  {registrations.filter(r => r.status === "attended").length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-lg font-bold text-blue-600">
                  {registrations.filter(r => r.status === "registered").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {filteredRegistrations.length > 0 ? (
            filteredRegistrations
              .sort((a: any, b: any) => new Date(b.registrationDate || b.course?.course_date).getTime() - new Date(a.registrationDate || a.course?.course_date).getTime())
              .map((registration: any) => (
                <Card key={registration.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {registration.course?.class?.name || "Unknown Class"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {registration.course?.trainer?.user?.first_name} {registration.course?.trainer?.user?.last_name}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(registration.status)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(registration.course?.course_date || registration.registrationDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(registration.course?.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="truncate">{registration.course?.class?.category?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getStatusIcon(registration.status)}
                          <span className="text-xs">
                            {registration.status === "attended" && `Attended: ${formatDateTime(registration.registrationDate)}`}
                            {registration.status === "registered" && `Class: ${formatDate(registration.course?.course_date)}`}
                            {registration.status === "cancelled" && `Cancelled: ${formatDate(registration.registrationDate)}`}
                          </span>
                        </div>
                      </div>

                      {registration.status === "registered" && registration.qr_code && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mt-3">
                          <div className="flex items-center space-x-2">
                            <QRGenerator value={registration.qr_code} size={30} />
                            <div>
                              <p className="text-xs font-medium">QR Code Available</p>
                              <p className="text-xs text-muted-foreground">Show for check-in</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowQRCode(registration.qr_code)}
                            className="h-7"
                          >
                            <QrCode className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No class history found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {historyFilter !== "all" ? `No ${historyFilter} classes found` : "Start by registering for classes"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const ProfileTab = () => (
    <div className="space-y-4 p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold">@{user?.firstName || "member"}</h2>
        <p className="text-muted-foreground">Member</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{(subscription as any).plan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions Remaining</span>
              <span className="font-medium">{(subscription as any).sessionsRemaining}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until</span>
              <span className="font-medium">{formatDate((subscription as any).endDate)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Bookings</span>
            <span className="font-medium">{registrations.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Bookings</span>
            <span className="font-medium">
              {registrations.filter(r => r.status === "registered").length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-primary text-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileAppSidebar />
            <h1 className="text-xl font-bold">Wild Energy</h1>
          </div>
          <div className="text-sm opacity-90">
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="m-0">
            <HomeTab />
          </TabsContent>
          <TabsContent value="courses" className="m-0">
            <ClassesTab />
          </TabsContent>
          <TabsContent value="subscriptions" className="m-0">
            <BookingsTab />
          </TabsContent>
          <TabsContent value="history" className="m-0">
            <HistoryTab />
          </TabsContent>
          <TabsContent value="profile" className="m-0">
            <ProfileTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Course Detail Dialog */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCourse.class?.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Class Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trainer</span>
                    <span>{selectedCourse.trainer?.user?.first_name} {selectedCourse.trainer?.user?.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{formatDate(selectedCourse.course_date || selectedCourse.courseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{formatTime(selectedCourse.start_time || selectedCourse.startTime)} - {formatTime(selectedCourse.end_time || selectedCourse.endTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span>{selectedCourse.class?.category?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>
                      {selectedCourse.max_participants > 0 && selectedCourse.current_participants >= selectedCourse.max_participants ? 'Course Full' :
                       `${selectedCourse.current_participants}/${selectedCourse.max_participants} people`}
                    </span>
                  </div>
                </div>
              </div>

              {isRegistered(selectedCourse.id) ? (
                <Button 
                  className="w-full"
                  onClick={() => setShowQRCode(getRegistrationQR(selectedCourse.id) || "")}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Show QR Code
                </Button>
              ) : (
                <div>
                  <Button 
                    className="w-full"
                    onClick={() => handleRegister(selectedCourse.id)}
                    disabled={registerMutation.isPending || (selectedCourse.max_participants > 0 && selectedCourse.current_participants >= selectedCourse.max_participants)}
                  >
                    {selectedCourse.max_participants > 0 && selectedCourse.current_participants >= selectedCourse.max_participants ? "Course is Full" :
                     registerMutation.isPending ? "Registering..." : "Register for Class"}
                  </Button>
                  {selectedCourse.max_participants > 0 && selectedCourse.current_participants >= selectedCourse.max_participants && (
                    <div className="text-xs text-muted-foreground text-center mt-2">
                      Contact trainer for a place
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Dialog */}
      {showQRCode && (
        <Dialog open={!!showQRCode} onOpenChange={() => setShowQRCode(null)}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle>Check-in QR Code</DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col items-center space-y-4">
              <QRGenerator value={showQRCode} size={200} />
              <p className="text-sm text-muted-foreground text-center">
                Show this QR code to the trainer for check-in
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}