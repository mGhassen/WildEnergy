"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Search, Clock, Users, Calendar, Star, Check } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/date";

// Types for member classes page
interface Category {
  id: number;
  name: string;
}

interface Trainer {
  id: number;
  user: {
    first_name: string;
    last_name: string;
  };
}

interface Class {
  id: number;
  name: string;
  description?: string;
  category?: Category;
  difficulty?: string;
}

interface Course {
  id: number;
  class: Class;
  trainer: Trainer;
  courseDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  scheduleId: number;
}

interface Subscription {
  id: number;
  status: string;
  sessions_remaining: number;
}

interface Registration {
  id: number;
  course_id: number;
  user_id: string;
  status: string;
  registration_date: string;
  qr_code: string;
  notes?: string;
}

export default function MemberClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
    queryFn: () => apiFetch("/api/courses"),
  });

  // Fetch categories from API
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiFetch("/api/categories"),
  });

  const { data: subscriptionsRaw } = useQuery({
    queryKey: ["/api/member/subscriptions"],
    queryFn: () => apiFetch("/api/member/subscriptions"),
  });
  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.status === 'active');
  const totalSessionsRemaining = activeSubscriptions.reduce((sum: number, sub: Subscription) => sum + (sub.sessions_remaining || 0), 0);

  const { data: registrations = [] } = useQuery({
    queryKey: ["/api/registrations"],
    queryFn: () => apiFetch("/api/registrations"),
  });

  const registerMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return await apiRequest("POST", "/api/registrations", { courseId });
    },
    onMutate: async (courseId: number) => {
      // Optimistically update the registrations
      await queryClient.cancelQueries({ queryKey: ["/api/registrations"] });
      
      const previousRegistrations = queryClient.getQueryData(["/api/registrations"]);
      
      // Optimistically add the new registration
      queryClient.setQueryData(["/api/registrations"], (old: Registration[]) => {
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
    onError: (error: unknown, courseId: number, context: unknown) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousRegistrations' in context) {
        queryClient.setQueryData(["/api/registrations"], context.previousRegistrations);
      }
      
      let errorMessage = "Failed to book course";
      
      // Handle specific error messages from the backend
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        if (error.message?.includes("Already registered")) {
          errorMessage = "You are already registered for this course";
        } else if (error.message?.includes("No active subscription")) {
          errorMessage = "No active subscription with sessions remaining";
        } else if (error.message?.includes("Course is full")) {
          errorMessage = "This course is full";
        } else {
          errorMessage = error.message;
        }
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
        description: "You are now registered for this course. Your QR code has been generated.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (registrationId: number) => {
      return await apiRequest("POST", `/api/registrations/${registrationId}/cancel`, {});
    },
    onMutate: async (registrationId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/registrations"] });
      
      // Snapshot the previous value
      const previousRegistrations = queryClient.getQueryData(["/api/registrations"]);
      
      // Optimistically update to remove the registration
      queryClient.setQueryData(["/api/registrations"], (old: Registration[]) => {
        if (!old) return old;
        return old.map((reg: Registration) => 
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
    onError: (error: unknown, registrationId: number, context: unknown) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousRegistrations' in context) {
        queryClient.setQueryData(["/api/registrations"], context.previousRegistrations);
      }
      let errorMessage = "Failed to cancel registration";
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      toast({
        title: "Cannot cancel registration",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create a set of course IDs that the user is registered for (only active registrations)
  const registrationsArray = Array.isArray(registrations) ? registrations : [];
  const registeredCourseIds = new Set(
    registrationsArray
      .filter((reg: Registration) => reg.status === 'registered')
      .map((reg: Registration) => reg.course_id)
  );

  // Helper function to get registration for a course
  const getRegistrationForCourse = (courseId: number) => {
    return registrationsArray.find((reg: Registration) => reg.course_id === courseId && reg.status === 'registered');
  };

  // Debug logging
  console.log('All registrations:', registrationsArray);
  console.log('Active registrations:', registrationsArray.filter((reg: Registration) => reg.status === 'registered'));
  console.log('Registered course IDs:', Array.from(registeredCourseIds));

  // Helper function to check if cancellation is allowed
  const canCancelRegistration = (course: Course) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const now = new Date();
    return now < courseDateTime;
  };

  // Helper function to check if course is in the past
  const isCourseInPast = (course: Course) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const now = new Date();
    return now >= courseDateTime;
  };

  // Helper function to check if within 24 hours
  const isWithin24Hours = (course: Course) => {
    const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
    const cutoffTime = new Date(courseDateTime.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    return now >= cutoffTime && now < courseDateTime;
  };

  const handleCancel = (course: Course) => {
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
  // Helper: get unique categories from courses
  const uniqueCategories = Array.from(new Set(coursesArray.map((c: Course) => c.class?.category?.name ?? '').filter(Boolean)));
  // Helper: day names
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const filteredCourses = coursesArray.filter((course: Course) => {
    const className = course.class?.name?.toLowerCase() || "";
    const trainerName = `${course.trainer?.user?.first_name || ''} ${course.trainer?.user?.last_name || ''}`.toLowerCase();
    const categoryName = course.class?.category?.name?.toLowerCase() || "";
    const matchesSearch = [className, trainerName, categoryName].some(str => str.includes(searchTerm.toLowerCase()));

    const matchesCategory = !categoryFilter || categoryFilter === "all" || categoryName === categoryFilter.toLowerCase();

    const courseDate = new Date(course.courseDate);
    const matchesDay = !dayFilter || dayFilter === "all" || courseDate.getDay().toString() === dayFilter;

    // Only show active courses that haven&apos;t ended yet
    const isNotPast = !isCourseInPast(course);

    return matchesSearch && matchesCategory && matchesDay && course.isActive && isNotPast;
  });

  const handleRegister = (courseId: number, scheduleId: number) => {
    // Find the course to check if it's in the past
    const course = coursesArray.find((c: Course) => c.id === courseId);
    
    // Check if course is in the past
    if (course && isCourseInPast(course)) {
      toast({
        title: "Cannot register",
        description: "This course has already started or ended.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if already registered for this course
    if (registeredCourseIds.has(courseId)) {
      toast({
        title: "Already registered",
        description: "You are already registered for this course instance.",
        variant: "destructive",
      });
      return;
    }
    
    if (!activeSubscriptions.length || totalSessionsRemaining <= 0) {
      toast({
        title: "No sessions remaining",
        description: "Please renew your subscription to book courses.",
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

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-blue-100 text-blue-800",
      advanced: "bg-red-100 text-red-800",
      expert: "bg-purple-100 text-purple-800",
    };
    return colors[difficulty?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  // Add this helper to render difficulty stars
  const renderDifficultyStars = (difficulty: string) => {
    const levels = {
      beginner: { count: 1, color: 'text-green-600', label: 'Beginner' },
      intermediate: { count: 2, color: 'text-blue-600', label: 'Intermediate' },
      advanced: { count: 3, color: 'text-red-600', label: 'Advanced' },
      expert: { count: 4, color: 'text-purple-600', label: 'Expert' },
    } as Record<string, { count: number; color: string; label: string }>;
    const key = difficulty?.toLowerCase() || '';
    const level = levels[key] || { count: 1, color: 'text-gray-400', label: 'Unknown' };
    return (
      <span className={`flex items-center ml-2`} title={level.label} aria-label={level.label}>
        {[...Array(level.count)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${level.color}`} fill="currentColor" />
        ))}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Browse Courses</h1>
        <p className="text-muted-foreground">Find and book fitness courses that fit your schedule</p>
      </div>

      {/* Current Plan Summary */}
      {activeSubscriptions.length > 0 && (
        <Card>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses, trainers, categories..."
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
                {categoriesLoading ? (
                  <SelectItem disabled value="loading">Loading...</SelectItem>
                ) : (
                  Array.isArray(categories) && categories.map((cat: Category) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {dayNames.map((day, idx) => (
                  <SelectItem key={day} value={String(idx)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filteredCourses.length} courses available
              </span>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setCategoryFilter(""); setDayFilter(""); }}>Reset Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
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
          filteredCourses.map((course: Course) => {
            const isRegistered = registeredCourseIds.has(course.id);
            
            return (
              <Card key={course.id}>
                <div className="flex-1 flex flex-col">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-base font-semibold leading-tight">{course.class?.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(course.class?.category?.name || "unknown")}>
                          {course.class?.category?.name
                            ? course.class.category.name.charAt(0).toUpperCase() + course.class.category.name.slice(1)
                            : "Unknown"}
                        </Badge>
                        {renderDifficultyStars(course.class?.difficulty || "beginner")}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-1 text-sm mb-2">
                      {course.class?.description || "Join this exciting fitness class and challenge yourself!"}
                    </CardDescription>
                    <div className="border-b border-gray-200 my-2" />
                    {/* Centered info bar */}
                    <div className="flex flex-row flex-wrap justify-center items-center gap-6 py-1">
                      {/* Trainer */}
                      <span className="flex items-center text-gray-700"><Users className="w-4 h-4 mr-1" />{course.trainer?.user?.first_name} {course.trainer?.user?.last_name}</span>
                      {/* Duration pill */}
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-500" />
                        {formatTime(course.startTime || "")} - {formatTime(course.endTime || "")}
                      </span>
                      {/* Date */}
                      <span className="flex items-center font-semibold text-primary"><Calendar className="w-4 h-4 mr-1" />{formatDate(course.courseDate)}</span>
                      {/* Time */}
                      <span className="flex items-center font-semibold text-primary">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTime(course.startTime)} - {formatTime(course.endTime)}
                      </span>
                    </div>
                  </CardHeader>
                </div>
                {/* Action buttons always at the bottom */}
                <div className="px-4 pt-2 pb-4">
                  {isRegistered ? (
                    <>
                      <div className="text-green-600 text-sm mb-1 flex items-center">
                        <Check className="w-4 h-4 mr-1" />
                        You&apos;re registered for this course
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-base py-2"
                        onClick={() => handleCancel(course)}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? "Cancelling..." : 
                         isWithin24Hours(course) ? "Cancel (Forfeit Session)" : "Cancel Registration"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full text-base py-2"
                      onClick={() => handleRegister(course.id, course.scheduleId)}
                      disabled={registerMutation.isPending || !activeSubscriptions.length || totalSessionsRemaining <= 0 || isCourseInPast(course)}
                      variant={isCourseInPast(course) ? "secondary" : "default"}
                    >
                      {isCourseInPast(course) ? "Course Ended" :
                       !activeSubscriptions.length || totalSessionsRemaining <= 0 ? "No Sessions Left" :
                       registerMutation.isPending ? "Registering..." : "Register for Course"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to see more courses
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
