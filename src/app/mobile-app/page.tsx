"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Settings
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTime } from "@/lib/date";
import QRGenerator from "@/components/qr-generator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";

interface Course {
  id: number;
  courseDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  class: {
    id: number;
    name: string;
    category: {
      name: string;
    };
  };
  trainer: {
    user: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Registration {
  id: number;
  registrationDate: string;
  qrCode: string;
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  // Queries
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['/api/member/courses'],
    enabled: !!user
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ['/api/registrations'],
    enabled: !!user
  });

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['/api/member/subscription'],
    enabled: !!user
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return apiRequest(`/api/registrations`, "POST", { courseId });
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

  // Get today's and upcoming courses
  const today = new Date();
  const todayCourses = courses.filter(course => {
    const courseDate = new Date(course.courseDate);
    return courseDate.toDateString() === today.toDateString();
  });

  const upcomingCourses = courses.filter(course => {
    const courseDate = new Date(course.courseDate);
    return courseDate > today;
  }).slice(0, 5);

  const isRegistered = (courseId: number) => {
    return registrations.some(reg => reg.course.id === courseId);
  };

  const getRegistrationQR = (courseId: number) => {
    const reg = registrations.find(reg => reg.course.id === courseId);
    return reg?.qrCode;
  };

  const handleRegister = (courseId: number) => {
    if (!subscription || subscription.sessionsRemaining <= 0) {
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
                <p className="font-medium">{subscription.plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.sessionsRemaining} sessions remaining
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
                    <p className="font-medium">{course.class.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(course.startTime)} - {formatTime(course.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      with {course.trainer.user.first_name} {course.trainer.user.last_name}
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
                  <h3 className="font-semibold text-lg">{course.class.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {course.trainer.user.first_name} {course.trainer.user.last_name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {course.class.category.name}
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
                  <span>{formatDate(course.courseDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatTime(course.startTime)} - {formatTime(course.endTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{course.currentParticipants}/{course.maxParticipants} people</span>
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
                  <h3 className="font-semibold">{registration.course.class.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {registration.course.trainer.user.first_name} {registration.course.trainer.user.last_name}
                  </p>
                </div>
                <Badge variant={registration.status === "registered" ? "default" : "secondary"}>
                  {registration.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDate(registration.course.courseDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatTime(registration.course.startTime)}</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowQRCode(registration.qrCode)}
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
              <span className="font-medium">{subscription.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions Remaining</span>
              <span className="font-medium">{subscription.sessionsRemaining}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until</span>
              <span className="font-medium">{formatDate(subscription.endDate)}</span>
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
          <h1 className="text-xl font-bold">Wild Energy</h1>
          <div className="text-sm opacity-90">
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="m-0">
            <HomeTab />
          </TabsContent>
          <TabsContent value="classes" className="m-0">
            <ClassesTab />
          </TabsContent>
          <TabsContent value="bookings" className="m-0">
            <BookingsTab />
          </TabsContent>
          <TabsContent value="profile" className="m-0">
            <ProfileTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-transparent h-16">
            <TabsTrigger 
              value="home" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="classes" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Classes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="bookings" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <Activity className="w-5 h-5" />
              <span className="text-xs">Bookings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex-col gap-1 h-full data-[state=active]:bg-primary/10"
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Course Detail Dialog */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle>{selectedCourse.class.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Class Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trainer</span>
                    <span>{selectedCourse.trainer.user.first_name} {selectedCourse.trainer.user.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{formatDate(selectedCourse.courseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{formatTime(selectedCourse.startTime)} - {formatTime(selectedCourse.endTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span>{selectedCourse.class.category.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>{selectedCourse.currentParticipants}/{selectedCourse.maxParticipants} people</span>
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
                <Button 
                  className="w-full"
                  onClick={() => handleRegister(selectedCourse.id)}
                  disabled={registerMutation.isPending}
                >
                  Register for Class
                </Button>
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