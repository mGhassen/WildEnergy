"use client";

import { format, parseISO } from "date-fns";
import React, { useMemo } from "react";
import {
  Calendar,
  Clock,
  Users,
  User,
  Star,
  Award,
  Target,
  Activity,
  CheckCircle,
  QrCode,
  UserCheck,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMemberCourse } from "@/hooks/useMemberCourses";
import { useMemberCourseRegistration } from "@/hooks/useMemberRegistration";
import { useMemberRegistrations } from "@/hooks/useMemberRegistrations";
import { useMemberSubscriptions } from "@/hooks/useMemberSubscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { subscriptionCoversGroup } from "@/lib/session-eligibility";
import { formatTrainerDisplayName } from "@/lib/format-trainer-name";
import { DashboardSkeleton } from "@/components/skeletons";

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  // course_date is typically YYYY-MM-DD; time is HH:MM or HH:MM:SS
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const timePart = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return parseISO(`${datePart}T${timePart}`);
}

interface MemberCourseDetailsViewProps {
  courseId: number;
  showBack?: boolean;
}

export function MemberCourseDetailsView({
  courseId,
  showBack = true,
}: MemberCourseDetailsViewProps) {
  const router = useRouter();
  const { data: courseDetails, isLoading: courseLoading, error } =
    useMemberCourse(courseId);
  const { data: registrations } = useMemberRegistrations();
  const { data: subscriptionsRaw } = useMemberSubscriptions();
  const registrationMutation = useMemberCourseRegistration();
  const { toast } = useToast();

  const subscriptions = Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [];
  const activeSubscriptions = subscriptions.filter(
    (sub: any) => sub.status === "active",
  );

  const courseData = courseDetails;

  const startDate = useMemo(() => {
    if (!courseData) return null;
    const d = courseData.course_date || courseData.courseDate || "";
    const t = courseData.start_time || courseData.startTime || "00:00";
    return combineDateAndTime(d, t);
  }, [courseData]);

  const endDate = useMemo(() => {
    if (!courseData) return null;
    const d = courseData.course_date || courseData.courseDate || "";
    const t = courseData.end_time || courseData.endTime || "00:00";
    return combineDateAndTime(d, t);
  }, [courseData]);

  const isCourseFull =
    !!courseData &&
    courseData.max_participants > 0 &&
    courseData.current_participants >= courseData.max_participants;

  const isRegistered = registrations?.some(
    (reg) => reg.course_id === courseId && reg.status === "registered",
  );
  const userRegistration = registrations?.find(
    (reg) => reg.course_id === courseId && reg.status === "registered",
  );

  const canCancelRegistration = () => {
    if (!startDate) return false;
    return new Date() < startDate;
  };

  const isWithin24Hours = () => {
    if (!startDate) return false;
    const cutoffTime = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    return now >= cutoffTime && now < startDate;
  };

  const canRegisterForCourse = () => {
    if (!activeSubscriptions.length || !courseData) return false;
    const groupId = courseData.class?.category?.group?.id;
    if (!groupId) return false;

    return activeSubscriptions.some((subscription) =>
      subscriptionCoversGroup(subscription as any, groupId),
    );
  };

  const handleRegister = async () => {
    try {
      await registrationMutation.mutateAsync(courseId);
      toast({
        title: "Registration successful",
        description: "You have been successfully registered for this course.",
      });
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (courseLoading) return <DashboardSkeleton />;

  if (error || !courseData || !startDate || !endDate) {
    return (
      <div className="space-y-4">
        {showBack && (
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Course not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const isOngoing = startDate <= now && endDate >= now;
  const isCompleted = endDate < now;

  const statusInfo = isOngoing
    ? {
        status: "In Progress",
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: Activity,
      }
    : isCompleted
      ? {
          status: "Completed",
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          icon: CheckCircle,
        }
      : {
          status: "Scheduled",
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          icon: Clock,
        };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {courseData.class?.name || "Unknown Class"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.status}
          </Badge>
          {courseData.class?.category && (
            <Badge
              variant="outline"
              className="text-sm border-0 px-3 py-1"
              style={{
                backgroundColor: courseData.class.category.color + "20",
                color: courseData.class.category.color,
                borderColor: courseData.class.category.color + "40",
              }}
            >
              {courseData.class.category.name}
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
              </p>
            </div>
            <div className="text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Difficulty</p>
              <div className="text-sm text-muted-foreground capitalize">
                {courseLoading ? (
                  <Skeleton className="h-4 w-16 mx-auto" />
                ) : (
                  courseData.class?.difficulty
                    ? (Array.isArray(courseData.class.difficulty)
                        ? courseData.class.difficulty.join(", ")
                        : courseData.class.difficulty)
                    : "Unknown"
                )}
              </div>
            </div>
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Participants</p>
              <div className="text-sm text-muted-foreground">
                {isCourseFull ? "Course Full" : "Open"}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <div className="text-lg font-semibold truncate">
                  {formatTrainerDisplayName(courseData.trainer)}
                </div>
                <Badge variant="secondary" className="text-xs w-fit">
                  Instructor
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {courseData.trainer?.specialization && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {courseData.trainer.specialization}
                  </span>
                )}
                {(courseData.trainer?.experience_years || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {`${courseData.trainer.experience_years} years`}
                  </span>
                )}
              </div>
              {courseData.trainer?.bio && (
                <div className="text-sm text-muted-foreground mt-2">
                  {courseData.trainer.bio}
                </div>
              )}
            </div>
          </div>

          {courseData.class?.description && (
            <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
              {courseData.class.description}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            {isRegistered ? (
              <>
                <div className="text-green-600 text-sm flex items-center justify-center w-full mb-4">
                  <Check className="w-4 h-4 mr-1" />
                  You&apos;re registered for this course
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/member/courses/${courseId}/cancel`)
                    }
                    disabled={!canCancelRegistration()}
                  >
                    {isWithin24Hours()
                      ? "Cancel (Forfeit Session)"
                      : "Cancel Registration"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      router.push(`/member/courses/${courseId}/qr`)
                    }
                    className="flex-1"
                    disabled={!userRegistration?.qr_code}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Show QR Code
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <Button
                  onClick={handleRegister}
                  disabled={
                    registrationMutation.isPending ||
                    isCompleted ||
                    !canRegisterForCourse() ||
                    isCourseFull
                  }
                  className="w-full"
                >
                  <UserCheck className="w-5 h-5 mr-2" />
                  {registrationMutation.isPending
                    ? "Registering..."
                    : isCourseFull
                      ? "Course is Full"
                      : !activeSubscriptions.length
                        ? "No Active Subscription"
                        : !canRegisterForCourse()
                          ? "No Sessions Left"
                          : "Register for Course"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
