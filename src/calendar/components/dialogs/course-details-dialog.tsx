"use client";

import { format, parseISO } from "date-fns";
import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Star, 
  Award, 
  BookOpen, 
  Target, 
  MapPin, 
  Activity,
  CheckCircle,
  XCircle,
  Info,
  QrCode,
  UserCheck,
  Check,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMemberCourse } from "@/hooks/useMemberCourses";
import { useMemberCourseRegistration } from "@/hooks/useMemberRegistration";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useMemberSubscriptions } from "@/hooks/useMemberSubscriptions";
import type { Subscription } from "@/lib/api/subscriptions";
import { useCancelRegistration } from "@/hooks/useRegistrations";
import { Skeleton } from "@/components/ui/skeleton";
import QRGenerator from "@/components/qr-generator";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  event: IEvent;
  children: React.ReactNode;
}

export function CourseDetailsDialog({ event, children }: IProps) {
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [registrationToCancel, setRegistrationToCancel] = useState<{ id: number; message: string } | null>(null);
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // Duration in minutes

  // Fetch detailed course information
  const { data: courseDetails, isLoading: courseLoading } = useMemberCourse(event.id);
  
  // Fetch registrations to check if user is already registered
  const { data: registrations } = useMemberRegistrations();
  const { data: subscriptionsRaw } = useMemberSubscriptions();
  const registrationMutation = useMemberCourseRegistration();
  const cancelMutation = useCancelRegistration();
  const { toast } = useToast();

  // Process subscriptions
  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');

  // Extract course information from event description
  const descriptionLines = event.description?.split('\n') || [];
  const instructorLine = descriptionLines.find(line => line.startsWith('Instructor:'));
  const difficultyLine = descriptionLines.find(line => line.startsWith('Difficulty:'));
  const durationLine = descriptionLines.find(line => line.startsWith('Duration:'));
  
  const instructor = instructorLine?.replace('Instructor: ', '') || 'Unknown';
  const difficulty = difficultyLine?.replace('Difficulty: ', '') || 'Unknown';
  const courseDuration = durationLine?.replace('Duration: ', '').replace(' minutes', '') || '60';

  // Use detailed course data if available, otherwise fall back to event data
  const courseData = courseDetails || {
    class: {
      name: event.title,
      description: descriptionLines.find(line => !line.startsWith('Instructor:') && !line.startsWith('Difficulty:') && !line.startsWith('Duration:')) || '',
      difficulty: difficulty,
      duration: parseInt(courseDuration),
      max_capacity: 0,
      equipment: '',
      category: event.category
    },
    trainer: {
      user: {
        first_name: instructor.split(' ')[0] || 'Unknown',
        last_name: instructor.split(' ').slice(1).join(' ') || 'Trainer'
      },
      specialization: '',
      experience_years: 0,
      bio: '',
      certification: ''
    },
    max_participants: 0,
    current_participants: 0,
    status: 'scheduled'
  };

  // Check if course is full
  const isCourseFull = courseData.max_participants > 0 && courseData.current_participants >= courseData.max_participants;

  // Check if user is already registered for this course
  const isRegistered = registrations?.some(reg => reg.course_id === event.id && reg.status === 'registered');
  const userRegistration = registrations?.find(reg => reg.course_id === event.id && reg.status === 'registered');

  // Helper function to check if cancellation is allowed
  const canCancelRegistration = () => {
    const now = new Date();
    return now < startDate;
  };

  // Helper function to check if within 24 hours
  const isWithin24Hours = () => {
    const cutoffTime = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    return now >= cutoffTime && now < startDate;
  };

  // Helper function to check if member can register for a course based on subscription group sessions
  const canRegisterForCourse = () => {
    // First check if member has any active subscriptions
    if (!activeSubscriptions.length) return false;
    
    // Get the category ID for this course
    const categoryId = courseData.class?.category?.id;
    if (!categoryId) return false;
    
    // Check if any active subscription has remaining sessions for this course's group
    for (const subscription of activeSubscriptions) {
      const groupSessions = (subscription as any).subscription_group_sessions || [];
      
      // Find group sessions that include this category
      for (const groupSession of groupSessions) {
        if (groupSession.sessions_remaining > 0) {
          // Check if this group includes the course's category
          // We need to check the plan's groups to see if any group contains this category
          const planGroups = (subscription as any).plan?.plan_groups || [];
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

  const handleRegister = async () => {
    try {
      await registrationMutation.mutateAsync(event.id);
      toast({
        title: "Registration successful",
        description: "You have been successfully registered for this course.",
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (!userRegistration) return;

    const within24h = isWithin24Hours();
    const message = within24h 
      ? "Cancelling within 24 hours will forfeit your session. Continue?"
      : "Are you sure you want to cancel this class registration?";
    
    setRegistrationToCancel({ id: userRegistration.id, message });
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (registrationToCancel) {
      cancelMutation.mutate(registrationToCancel.id);
      setShowCancelConfirm(false);
      setRegistrationToCancel(null);
    }
  };

  const handleShowQRCode = () => {
    if (userRegistration?.qr_code) {
      setShowQRCode(userRegistration.qr_code);
    }
  };


  // Get status based on current time
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate >= now;
  const isCompleted = endDate < now;

  const getStatusInfo = () => {
    if (isOngoing) {
      return { 
        status: 'In Progress', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: Activity
      };
    } else if (isCompleted) {
      return { 
        status: 'Completed', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle
      };
    } else {
      return { 
        status: 'Scheduled', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent className="max-w-[95vw] max-h-[90vh] sm:max-w-2xl sm:max-h-[80vh] overflow-y-auto">
          {!showQRCode ? (
            <>
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    {courseData.class?.name || 'Unknown Class'}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.status}
                    </Badge>
                    {courseData.class?.category && (
                      <Badge 
                        variant="outline" 
                        className="text-xs sm:text-sm border-0 px-2 sm:px-3 py-1"
                        style={{ 
                          backgroundColor: courseData.class.category.color + '20',
                          color: courseData.class.category.color,
                          borderColor: courseData.class.category.color + '40'
                        }}
                      >
                        {courseData.class.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
            {/* Course Information */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                    </p>
                  </div>

                  <div className="text-center">
                    <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Difficulty</p>
                    <div className="text-sm text-muted-foreground capitalize">
                      {courseLoading ? <Skeleton className="h-4 w-16 mx-auto" /> : courseData.class?.difficulty || 'Unknown'}
                    </div>
                  </div>

                  <div className="text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Participants</p>
                    <div className="text-sm text-muted-foreground">
                      {courseLoading ? <Skeleton className="h-4 w-20 mx-auto" /> : 
                        courseData.max_participants > 0 ? `${courseData.current_participants}/${courseData.max_participants}` : 'Open'}
                    </div>
                    {isCourseFull && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                        Course Full
                      </div>
                    )}
                  </div>
                </div>

                {/* Trainer Information */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-1">
                      <div className="text-base sm:text-lg font-semibold text-foreground truncate">
                        {courseLoading ? <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" /> : 
                          `${courseData.trainer?.user?.first_name || 'Unknown'} ${courseData.trainer?.user?.last_name || 'Trainer'}`}
                      </div>
                      <Badge variant="secondary" className="text-xs w-fit">
                        Instructor
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      {courseData.trainer?.specialization && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {courseLoading ? <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" /> : courseData.trainer.specialization}
                        </span>
                      )}

                      {(courseData.trainer?.experience_years || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {courseLoading ? <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /> : `${courseData.trainer.experience_years} years`}
                        </span>
                      )}

                      {courseData.trainer?.certification && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {courseLoading ? <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" /> : courseData.trainer.certification}
                        </span>
                      )}
                    </div>

                    {courseData.trainer?.bio && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                        {courseLoading ? <Skeleton className="h-3 sm:h-4 w-full" /> : courseData.trainer.bio}
                      </div>
                    )}
                  </div>
                </div>

                {courseData.class?.description && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {courseLoading ? <Skeleton className="h-4 w-full" /> : courseData.class.description}
                    </div>
                  </div>
                )}


                {isOngoing && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <Activity className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Course in Progress
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          This course is currently ongoing. Join now if you haven't already!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Course Completed
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                          This course has been completed. Registration is no longer available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Section */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                  {isRegistered ? (
                    <>
                      <div className="text-green-600 text-sm flex items-center justify-center w-full mb-3 sm:mb-4">
                        <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-center">You're registered for this course</span>
                      </div>
                      {userRegistration?.notes && (
                        <div className="w-full p-3 bg-muted/30 rounded-lg mb-3 sm:mb-4">
                          <p className="text-sm font-medium text-foreground mb-1">Registration Notes:</p>
                          <p className="text-sm text-muted-foreground break-words">{userRegistration.notes}</p>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-sm py-2 sm:py-1.5 px-3 order-2 sm:order-1"
                          onClick={handleCancel}
                          disabled={cancelMutation.isPending || !canCancelRegistration()}
                        >
                          {cancelMutation.isPending ? "Cancelling..." : 
                           isWithin24Hours() ? "Cancel (Forfeit Session)" : "Cancel Registration"}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleShowQRCode}
                          className="flex-1 text-sm py-2 sm:py-1.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground order-1 sm:order-2"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Show QR Code
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button 
                      onClick={handleRegister} 
                      disabled={registrationMutation.isPending || isCompleted || !canRegisterForCourse() || isCourseFull}
                      className="w-full text-sm sm:text-base py-2 sm:py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {registrationMutation.isPending ? 'Registering...' : 
                       isCourseFull ? 'Course is Full' :
                       !activeSubscriptions.length ? 'No Active Subscription' :
                       !canRegisterForCourse() ? 'No Sessions Left' :
                       'Register for Course'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          <DialogFooter>
            {/* Empty footer - registration controls are now in the main content */}
          </DialogFooter>
            </>
          ) : (
            <>
              {/* QR Code View */}
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQRCode(null)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    Your QR Code
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex flex-col items-center space-y-4 sm:space-y-6 py-4 sm:py-8">
                <div className="p-3 sm:p-4 bg-muted/30 rounded-lg border">
                  <QRGenerator value={showQRCode} size={250} />
                </div>
                
                <div className="text-center max-w-md w-full px-4">
                  <p className="text-sm text-muted-foreground mb-2">QR Code Value:</p>
                  <p className="text-xs font-mono bg-muted p-3 rounded break-all text-foreground">
                    {showQRCode}
                  </p>
                </div>

                <div className="text-center px-4">
                  <p className="text-sm text-muted-foreground">
                    Show this QR code to the trainer for check-in
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowQRCode(null)}
                  className="w-full"
                >
                  Back to Course Details
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>

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
      </Dialog>
    </>
  );
}
