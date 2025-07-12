import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Search, Clock, Users, Calendar, Star } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/date";

export default function MemberClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: subscriptionsRaw } = useQuery({
    queryKey: ["/api/member/subscriptions"],
    queryFn: () => apiFetch("/api/member/subscriptions"),
  });
  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
  const totalSessionsRemaining = activeSubscriptions.reduce((sum: number, sub: any) => sum + (sub.sessions_remaining || 0), 0);

  const { data: registrations = [] } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const registerMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await apiRequest("POST", "/api/registrations", { courseId });
      return response.json();
    },
    onMutate: async (courseId: number) => {
      // Optimistically update the registrations
      await queryClient.cancelQueries({ queryKey: ["/api/registrations"] });
      
      const previousRegistrations = queryClient.getQueryData(["/api/registrations"]);
      
      // Optimistically add the new registration
      queryClient.setQueryData(["/api/registrations"], (old: any) => {
        const newRegistration = {
          id: Date.now(), // temporary ID
          course_id: courseId,
          user_id: "temp",
          status: "registered",
          registration_date: new Date().toISOString(),
          qr_code: "temp",
          notes: null
        };
        return old ? [...old, newRegistration] : [newRegistration];
      });
      
      return { previousRegistrations };
    },
    onError: (error: any, courseId: number, context: any) => {
      // Rollback on error
      if (context?.previousRegistrations) {
        queryClient.setQueryData(["/api/registrations"], context.previousRegistrations);
      }
      
      let errorMessage = "Failed to book class";
      
      // Handle specific error messages from the backend
      if (error.message?.includes("Already registered")) {
        errorMessage = "You are already registered for this class";
      } else if (error.message?.includes("No active subscription")) {
        errorMessage = "No active subscription with sessions remaining";
      } else if (error.message?.includes("Course is full")) {
        errorMessage = "This class is full";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Booking failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
      toast({
        title: "Registration successful!",
        description: "You are now registered for this class. Your QR code has been generated.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (registrationId: number) => {
      const response = await apiRequest("POST", `/api/registrations/${registrationId}/cancel`, {});
      return response.json();
    },
    onMutate: async (registrationId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/registrations"] });
      
      // Snapshot the previous value
      const previousRegistrations = queryClient.getQueryData(["/api/registrations"]);
      
      // Optimistically update to remove the registration
      queryClient.setQueryData(["/api/registrations"], (old: any) => {
        if (!old) return old;
        return old.map((reg: any) => 
          reg.id === registrationId ? { ...reg, status: 'cancelled' } : reg
        );
      });
      
      return { previousRegistrations };
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      
      if (data.isWithin24Hours) {
        toast({
          title: "Registration cancelled",
          description: "Your registration has been cancelled. Session forfeited due to late cancellation.",
        });
      } else {
        toast({
          title: "Registration cancelled",
          description: "Your registration has been cancelled and session refunded to your account.",
        });
      }
    },
    onError: (error: any, registrationId, context) => {
      // Rollback on error
      if (context?.previousRegistrations) {
        queryClient.setQueryData(["/api/registrations"], context.previousRegistrations);
      }
      
      toast({
        title: "Cannot cancel registration",
        description: error.message || "Failed to cancel registration",
        variant: "destructive",
      });
    },
  });

  // Create a set of course IDs that the user is registered for (only active registrations)
  const registrationsArray = Array.isArray(registrations) ? registrations : [];
  const registeredCourseIds = new Set(
    registrationsArray
      .filter((reg: any) => reg.status === 'registered')
      .map((reg: any) => reg.course_id)
  );

  // Helper function to get registration for a course
  const getRegistrationForCourse = (courseId: number) => {
    return registrationsArray.find((reg: any) => reg.course_id === courseId && reg.status === 'registered');
  };

  // Debug logging
  console.log('All registrations:', registrationsArray);
  console.log('Active registrations:', registrationsArray.filter((reg: any) => reg.status === 'registered'));
  console.log('Registered course IDs:', Array.from(registeredCourseIds));

  // Helper function to check if cancellation is allowed
  const canCancelRegistration = (course: any) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const now = new Date();
    return now < courseDateTime;
  };

  // Helper function to check if course is in the past
  const isCourseInPast = (course: any) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const now = new Date();
    return now >= courseDateTime;
  };

  // Helper function to check if within 24 hours
  const isWithin24Hours = (course: any) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const cutoffTime = new Date(courseDateTime.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    return now >= cutoffTime && now < courseDateTime;
  };

  const handleCancel = (course: any) => {
    const registration = getRegistrationForCourse(course.id);
    if (!registration) return;

    const within24h = isWithin24Hours(course);
    const message = within24h 
      ? "Cancelling within 24 hours will forfeit your session. Continue?"
      : "Are you sure you want to cancel this class registration?";
    
    if (confirm(message)) {
      cancelMutation.mutate(registration.id);
    }
  };

  const coursesArray = Array.isArray(courses) ? courses : [];
  const filteredCourses = coursesArray.filter((course: any) => {
    const matchesSearch = `${course.class?.name} ${course.trainer?.firstName} ${course.trainer?.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || course.class?.category === categoryFilter;
    const courseDate = new Date(course.courseDate);
    const matchesDay = !dayFilter || dayFilter === "all" || courseDate.getDay().toString() === dayFilter;
    
    // Only show active courses that haven't ended yet
    const isNotPast = !isCourseInPast(course);
    
    return matchesSearch && matchesCategory && matchesDay && course.isActive && isNotPast;
  });

  const handleRegister = (courseId: number, scheduleId: number) => {
    // Find the course to check if it's in the past
    const course = coursesArray.find((c: any) => c.id === courseId);
    
    // Check if course is in the past
    if (course && isCourseInPast(course)) {
      toast({
        title: "Cannot register",
        description: "This class has already started or ended.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if already registered for this course
    if (registeredCourseIds.has(courseId)) {
      toast({
        title: "Already registered",
        description: "You are already registered for this class instance.",
        variant: "destructive",
      });
      return;
    }
    
    if (!activeSubscriptions.length || totalSessionsRemaining <= 0) {
      toast({
        title: "No sessions remaining",
        description: "Please renew your subscription to book classes.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(courseId);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      yoga: "bg-green-100 text-green-800",
      hiit: "bg-red-100 text-red-800",
      strength: "bg-blue-100 text-blue-800",
      cardio: "bg-orange-100 text-orange-800",
      pilates: "bg-purple-100 text-purple-800",
      boxing: "bg-gray-100 text-gray-800",
    };
    return colors[category?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getIntensityLevel = (category: string) => {
    const levels: Record<string, { level: string; color: string }> = {
      yoga: { level: "Low", color: "text-green-600" },
      hiit: { level: "High", color: "text-red-600" },
      strength: { level: "Medium", color: "text-blue-600" },
      cardio: { level: "Medium", color: "text-orange-600" },
      pilates: { level: "Low", color: "text-purple-600" },
      boxing: { level: "High", color: "text-red-600" },
    };
    return levels[category?.toLowerCase()] || { level: "Medium", color: "text-gray-600" };
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Browse Classes</h1>
        <p className="text-muted-foreground">Find and book fitness classes that fit your schedule</p>
      </div>

      {/* Current Plan Summary */}
      {activeSubscriptions.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">Active Subscriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Total sessions remaining across all active plans
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{totalSessionsRemaining}</p>
                <p className="text-sm text-muted-foreground">sessions left</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="yoga">Yoga</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
                <SelectItem value="strength">Strength Training</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="pilates">Pilates</SelectItem>
                <SelectItem value="boxing">Boxing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filteredCourses.length} classes available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course: any) => {
            const isRegistered = registeredCourseIds.has(course.id);
            const intensity = getIntensityLevel(course.class?.category);
            
            return (
              <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{course.class?.name}</CardTitle>
                    <Badge className={getCategoryColor(course.class?.category)}>
                      {course.class?.category}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.class?.description || "Join this exciting fitness class and challenge yourself!"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className={`font-medium ${intensity.color}`}>
                          {intensity.level} Intensity
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>{course.class?.duration} min</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(course.courseDate)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{formatTime(course.startTime)} - {formatTime(course.endTime)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>
                          with Trainer {course.trainer?.firstName && course.trainer?.lastName
                            ? `${course.trainer.firstName} ${course.trainer.lastName}`
                            : 'Unknown Trainer'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{course.currentParticipants}/{course.maxParticipants} participants</span>
                      </div>
                    </div>

                    {isRegistered ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-600 text-sm mb-2">
                          <span className="mr-2">✓</span>
                          You're registered for this class
                        </div>
                        {canCancelRegistration(course) ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleCancel(course)}
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? "Cancelling..." : 
                             isWithin24Hours(course) ? "Cancel (Forfeit Session)" : "Cancel Registration"}
                          </Button>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center">
                            Cannot cancel - class has started
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleRegister(course.id, course.scheduleId)}
                        disabled={registerMutation.isPending || !activeSubscriptions.length || totalSessionsRemaining <= 0 || isCourseInPast(course)}
                        variant={isCourseInPast(course) ? "secondary" : "default"}
                      >
                        {isCourseInPast(course) ? "Class Ended" :
                         !activeSubscriptions.length || totalSessionsRemaining <= 0 ? "No Sessions Left" :
                         registerMutation.isPending ? "Registering..." : "Register for Class"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No classes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to see more classes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
