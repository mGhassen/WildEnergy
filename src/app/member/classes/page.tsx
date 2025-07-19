"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Search, Clock, Users, Calendar, Star, Check, AlertTriangle, QrCode } from "lucide-react";
import { formatTime, getDayName } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, getAuthToken } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRGenerator from "@/components/qr-generator";

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
  duration?: number;
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
  const [overlapDialog, setOverlapDialog] = useState<{
    isOpen: boolean;
    courseId: number | null;
    overlappingCourses: Array<{
      courseId: number;
      courseName: string;
      date: string;
      startTime: string;
      endTime: string;
      trainer: string;
    }>;
  }>({
    isOpen: false,
    courseId: null,
    overlappingCourses: []
  });
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/member/courses"],
    queryFn: () => apiFetch("/api/member/courses"),
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
      // Get token using the shared utility
      const token = getAuthToken();
      console.log('Registration attempt with token:', token ? 'present' : 'missing');
      
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ courseId })
      });
      
      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 409) {
          const overlapData = await response.json();
          throw { type: 'OVERLAP', ...overlapData };
        } else {
          let message = `${response.status}: ${response.statusText}`;
          try {
            const text = await response.text();
            if (text.startsWith('{') || text.startsWith('[')) {
              const errorData = JSON.parse(text);
              message = errorData.error || errorData.message || message;
            } else if (text.length > 0 && text.length < 200) {
              message = text;
            }
          } catch {
            // If text parsing fails, use the status message
          }
          throw new Error(message);
        }
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      
      return response;
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
      
      console.log('Registration error:', error);
      console.log('Error type:', typeof error);
      console.log('Error keys:', error && typeof error === 'object' ? Object.keys(error) : 'not an object');
      
      // Check if this is an overlap error
      if (typeof error === 'object' && error && 'type' in error && error.type === 'OVERLAP') {
        const overlapData = error as any;
        console.log('Overlap detected:', overlapData);
        setOverlapDialog({
          isOpen: true,
          courseId: courseId,
          overlappingCourses: overlapData.overlappingCourses || []
        });
        return;
      }
      
      // Check if this is an overlap error by looking at the error message
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        const errorMessage = error.message;
        
        // Handle other specific error messages
        let errorMessageToShow = "Failed to book course";
        if (errorMessage.includes("Already registered")) {
          errorMessageToShow = "You are already registered for this course";
        } else if (errorMessage.includes("No active subscription")) {
          errorMessageToShow = "No active subscription with sessions remaining";
        } else if (errorMessage.includes("Course is full")) {
          errorMessageToShow = "This course is full";
        } else {
          errorMessageToShow = errorMessage;
        }
        
        toast({
          title: "Booking failed",
          description: errorMessageToShow,
          variant: "destructive",
        });
        return;
      }
      
      // Fallback error handling
      toast({
        title: "Booking failed",
        description: "An unexpected error occurred while registering for the course.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/member/courses"] });
      
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
  
  // Debug logging
  console.log('Total courses received:', coursesArray.length);
  console.log('Course IDs:', coursesArray.map((c: Course) => c.id));
  
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
        <p className="text-muted-foreground">Find and book Pole Dance courses that fit your schedule</p>
      </div>

      {/* Current Plan Summary */}
      {/* {activeSubscriptions.length > 0 && (
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
      )} */}

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
      <TooltipProvider>
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
              <Card key={course.id} className="flex flex-col h-full">
                <CardHeader className="pb-2 px-4 pt-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CardTitle className="text-base font-semibold leading-tight cursor-pointer underline underline-offset-2">
                          {course.class?.name}
                        </CardTitle>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="font-semibold mb-1">{course.class?.name}</div>
                        <div className="text-xs text-muted-foreground mb-1">{course.class?.description}</div>
                        <div className="text-xs text-muted-foreground mb-1">Date: {formatDate(course.courseDate)}</div>
                        <div className="text-xs text-muted-foreground mb-1">Time: {formatTime(course.startTime)} - {formatTime(course.endTime)}</div>
                        <div className="text-xs text-muted-foreground mb-1">Category: {course.class?.category?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground mb-1">Difficulty: {course.class?.difficulty || '-'}</div>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(course.class?.category?.name || "unknown")}>{course.class?.category?.name ? course.class.category.name.charAt(0).toUpperCase() + course.class.category.name.slice(1) : "Unknown"}</Badge>
                      {renderDifficultyStars(course.class?.difficulty || "beginner")}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 text-sm mb-3">
                    {course.class?.description || "Join this exciting Pole Dance class and challenge yourself!"}
                  </CardDescription>
                  
                  {/* Course Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Trainer */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-medium text-foreground">
                        {course.trainer?.user?.first_name} {course.trainer?.user?.last_name}
                      </span>
                    </div>
                    
                    {/* Date */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-medium text-foreground">
                        {formatDate(course.courseDate)}
                      </span>
                    </div>
                    
                    {/* Time */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-medium text-foreground">
                        {formatTime(course.startTime)} - {formatTime(course.endTime)}
                      </span>
                    </div>
                    
                    {/* Duration */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-medium text-foreground">
                        {course.class?.duration || 60} min
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Action buttons always at the bottom */}
                <div className="px-4 pb-4 mt-auto">
                  {isRegistered ? (
                    <>
                      <div className="text-green-600 text-sm mb-2 flex items-center">
                        <Check className="w-4 h-4 mr-1" />
                        You&apos;re registered for this course
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-base py-2"
                          onClick={() => handleCancel(course)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? "Cancelling..." : 
                           isWithin24Hours(course) ? "Cancel (Forfeit Session)" : "Cancel Registration"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const registration = getRegistrationForCourse(course.id);
                            if (registration?.qr_code) {
                              setSelectedQR(registration.qr_code);
                            }
                          }}
                          className="px-3"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
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
      </TooltipProvider>

      {/* Overlap Confirmation Dialog */}
      <Dialog open={overlapDialog.isOpen} onOpenChange={(open) => setOverlapDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Course Time Conflict
            </DialogTitle>
            <DialogDescription>
              This course overlaps with other courses you're already registered for. Are you sure you want to register anyway?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Overlapping courses:</div>
            {overlapDialog.overlappingCourses.map((course, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <div className="font-medium text-sm">{course.courseName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(course.date)} • {formatTime(course.startTime)} - {formatTime(course.endTime)}
                </div>
                <div className="text-xs text-muted-foreground">with {course.trainer}</div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOverlapDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (overlapDialog.courseId) {
                  // Proceed with registration despite overlap using force endpoint
                  apiRequest("POST", "/api/registrations/force", { courseId: overlapDialog.courseId })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/member/courses"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
                      toast({
                        title: "Registration successful!",
                        description: "You are now registered for this course despite the time conflict.",
                      });
                      setOverlapDialog(prev => ({ ...prev, isOpen: false }));
                    })
                    .catch((error) => {
                      let errorMessage = "Failed to register for course";
                      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
                        errorMessage = error.message;
                      }
                      toast({
                        title: "Registration failed",
                        description: errorMessage,
                        variant: "destructive",
                      });
                    });
                }
              }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Registering..." : "Register Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Your QR Code</h3>
            <QRGenerator value={selectedQR} size={300} />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">QR Code Value:</p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">{selectedQR}</p>
            </div>
            <button
              onClick={() => setSelectedQR(null)}
              className="mt-4 w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
