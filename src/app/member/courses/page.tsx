"use client";

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelRegistration, useForceRegistration } from "@/hooks/useRegistrations";
import { useMemberCourses, useMemberSubscriptions, useMemberCategories } from "@/hooks/useMember";
import { useMemberCourseRegistration } from "@/hooks/useMemberRegistration";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { CardSkeleton, ListSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, Users, Calendar, Star, Check, AlertTriangle, QrCode } from "lucide-react";
import { formatTime, getDayName } from "@/lib/date";
import { formatDate } from "@/lib/date";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import QRGenerator from "@/components/qr-generator";
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { ClientContainer } from '@/calendar/components/client-container';

// Types for member classes page
interface Category {
  id: number;
  name: string;
  color: string;
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
  subscription_group_sessions?: Array<{
    id: number;
    group_id: number;
    sessions_remaining: number;
    total_sessions: number;
    groups: {
      id: number;
      name: string;
      description: string;
      color: string;
    };
  }>;
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

// Convert courses to big-calendar events format
const convertCoursesToEvents = (courses: any[], registrations: any[] = []) => {
  if (!courses) return [];

  return courses.map((course: any) => {
    // Check if user is registered for this course
    const isRegistered = registrations.some(reg => reg.course_id === course.id && reg.status === 'registered');
    const instructorName = course.trainer?.user ? 
      `${course.trainer.user.first_name} ${course.trainer.user.last_name}` : 
      'Unknown Trainer';

    // Create start and end dates
    const startDate = new Date(`${course.courseDate}T${course.startTime}`);
    const endDate = new Date(`${course.courseDate}T${course.endTime}`);

    // Use category color or default to blue
    const getColor = (category?: { color: string }): "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray" => {
      if (!category?.color) return "blue";
      
      // Map hex colors to calendar color names
      const colorMap: Record<string, "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray"> = {
        '#FF0000': 'red',
        '#00FF00': 'green', 
        '#0000FF': 'blue',
        '#FFFF00': 'yellow',
        '#FF00FF': 'purple',
        '#FFA500': 'orange',
        '#808080': 'gray',
        '#FFD700': 'yellow', // Gold
        '#FF69B4': 'purple', // Hot pink
        '#00CED1': 'blue',   // Dark turquoise
        '#32CD32': 'green',  // Lime green
        '#FF6347': 'orange', // Tomato
        '#9370DB': 'purple', // Medium purple
        '#20B2AA': 'green',  // Light sea green
        '#FF1493': 'purple', // Deep pink
        '#00BFFF': 'blue',   // Deep sky blue
        '#FF8C00': 'orange', // Dark orange
        '#DC143C': 'red',    // Crimson
        '#8B008B': 'purple', // Dark magenta
      };
      
      return colorMap[category.color.toUpperCase()] || 'blue';
    };

    return {
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nDifficulty: ${course.class?.difficulty || 'Unknown'}\nDuration: ${course.class?.duration || 60} minutes`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: getColor(course.class?.category),
      user: {
        id: course.trainer?.id?.toString() || 'unknown',
        name: instructorName,
        picturePath: null
      },
      category: course.class?.category ? {
        id: course.class.category.id,
        name: course.class.category.name,
        color: course.class.category.color
      } : undefined,
      isRegistered: isRegistered
    };
  });
};

export default function MemberCourses() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'week';
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [registrationToCancel, setRegistrationToCancel] = useState<{ id: number; message: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useMemberCourses();
  const { data: categories, isLoading: categoriesLoading } = useMemberCategories();
  const { data: subscriptionsRaw } = useMemberSubscriptions();
  const { data: registrations } = useMemberRegistrations();
  
  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const activeSubscriptions = subscriptions.filter((sub: Subscription) => sub.status === 'active');
  const totalSessionsRemaining = activeSubscriptions.reduce((sum: number, sub: Subscription) => {
    const groupSessions = sub.subscription_group_sessions || [];
    return sum + groupSessions.reduce((groupSum: number, group: any) => groupSum + (group.sessions_remaining || 0), 0);
  }, 0);

  const registerMutation = useMemberCourseRegistration();
  
  // Handle overlap errors from registration
  if (registerMutation.error && typeof registerMutation.error === 'object' && registerMutation.error && 'type' in registerMutation.error && registerMutation.error.type === 'OVERLAP') {
    const overlapData = registerMutation.error as any;
    console.log('Overlap detected:', overlapData);
    setOverlapDialog({
      isOpen: true,
      courseId: registerMutation.variables || 0,
      overlappingCourses: overlapData.overlappingCourses || []
    });
  }

  const cancelMutation = useCancelRegistration();
  const forceRegistrationMutation = useForceRegistration();

  // Convert courses to events for calendar
  const events = useMemo(() => {
    const convertedEvents = convertCoursesToEvents(courses || [], registrations || []);
    console.log('=== MEMBER COURSES EVENTS DEBUG ===');
    console.log('Courses count:', courses?.length || 0);
    console.log('Registrations count:', registrations?.length || 0);
    console.log('Converted events count:', convertedEvents.length);
    console.log('Events with registration status:', convertedEvents);
    return convertedEvents;
  }, [courses, registrations]);

  // Create a single user for the member
  const users = useMemo(() => {
    return [{
      id: 'member',
      name: 'My Classes',
      picturePath: null
    }];
  }, []);

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

  // Helper function to check if member can register for a course based on subscription group sessions
  const canRegisterForCourse = (course: Course) => {
    if (!activeSubscriptions.length) return false;
    
    // Get the category ID for this course
    const categoryId = course.class?.category?.id;
    if (!categoryId) return false;
    
    // Check if any active subscription has remaining sessions for this course's group
    for (const subscription of activeSubscriptions) {
      const groupSessions = subscription.subscription_group_sessions || [];
      
      // Find group sessions that include this category
      for (const groupSession of groupSessions) {
        if (groupSession.sessions_remaining > 0) {
          // Check if this group includes the course's category
          // We need to check the plan's groups to see if any group contains this category
          const planGroups = subscription.plan?.plan_groups || [];
          for (const planGroup of planGroups) {
            if (planGroup.group_id === groupSession.group_id) {
              // Check if this group has the course's category
              const groupCategories = planGroup.groups?.category_groups || [];
              const hasCategory = groupCategories.some((cat: any) => cat.categories?.id === categoryId);
              if (hasCategory) {
                return true;
              }
            }
          }
        }
      }
    }
    
    return false;
  };

  const handleCancel = (course: Course) => {
    const registration = getRegistrationForCourse(course.id);
    if (!registration) return;

    const within24h = isWithin24Hours(course);
    const message = within24h 
      ? "Cancelling within 24 hours will forfeit your session. Continue?"
      : "Are you sure you want to cancel this class registration?";
    
    setRegistrationToCancel({ id: registration.id, message });
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (registrationToCancel) {
      cancelMutation.mutate(registrationToCancel.id);
      setShowCancelConfirm(false);
      setRegistrationToCancel(null);
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

    // Only show active courses that haven't ended yet
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
    
    if (!canRegisterForCourse(course)) {
      toast({
        title: "No sessions remaining",
        description: "Please renew your subscription to book courses.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(courseId);
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

  if (coursesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} showImage={false} lines={4} />
          ))}
        </div>
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Error loading classes</h3>
            <p className="text-muted-foreground">There was an error loading your class schedule. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses & Schedule</h1>
          <p className="text-muted-foreground mt-1">Browse courses and manage your class schedule</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
        </TabsList>
        
        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <CalendarProvider users={users} events={events} registrations={registrations || []}>
            <div className="mx-auto flex max-w-screen-2xl flex-col gap-4">
              <ClientContainer view={view as any} />
            </div>
          </CalendarProvider>
        </TabsContent>
        
        {/* Browse Courses Tab */}
        <TabsContent value="browse" className="space-y-6">
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
              {coursesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} showImage={false} lines={4} />
                ))
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map((course: Course) => {
                  const isRegistered = registeredCourseIds.has(course.id);
                  return (
                    <Card key={course.id} className="flex flex-col h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="text-base font-semibold leading-tight cursor-pointer underline underline-offset-2">
                                {course.class?.name}
                              </h3>
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
                            <Badge 
                              className="text-white border-0"
                              style={{ 
                                backgroundColor: course.class?.category?.color || '#6b7280'
                              }}
                            >
                              {course.class?.category?.name ? course.class.category.name.charAt(0).toUpperCase() + course.class.category.name.slice(1) : "Unknown"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="line-clamp-2 text-sm text-muted-foreground flex-1">
                            {course.class?.description || "Join this exciting Pole Dance class and challenge yourself!"}
                          </p>
                          <div className="ml-2">
                            {renderDifficultyStars(course.class?.difficulty || "beginner")}
                          </div>
                        </div>
                        
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
                        
                        {/* Action buttons always at the bottom */}
                        <div className="mt-auto pt-4">
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
                            disabled={registerMutation.isPending || !canRegisterForCourse(course) || isCourseInPast(course)}
                            variant={isCourseInPast(course) ? "secondary" : "default"}
                          >
                            {isCourseInPast(course) ? "Course Ended" :
                             !canRegisterForCourse(course) ? "No Sessions Left" :
                             registerMutation.isPending ? "Registering..." : "Register for Course"}
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
                  <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters to see more courses
                  </p>
                </div>
              )}
            </div>
          </TooltipProvider>
        </TabsContent>
      </Tabs>

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
                  forceRegistrationMutation.mutate(overlapDialog.courseId, {
                    onSuccess: () => {
                      setOverlapDialog(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }
              }}
              disabled={forceRegistrationMutation.isPending}
            >
              {forceRegistrationMutation.isPending ? "Registering..." : "Register Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center">Your QR Code</h3>
            <div className="mb-4">
              <QRGenerator value={selectedQR} size={300} />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">QR Code Value:</p>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">{selectedQR}</p>
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

      {/* Cancel Registration Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleConfirmCancel}
        title="Cancel Registration"
        description={registrationToCancel?.message || "Are you sure you want to cancel this class registration?"}
        confirmText="Cancel Registration"
        variant="destructive"
        isPending={cancelMutation.isPending}
      />
    </div>
  );
}
