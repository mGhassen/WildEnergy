"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCourses } from '@/hooks/useCourse';
import { useAdminRegistrations, useAdminCheckins, useAdminSubscriptions } from '@/hooks/useAdmin';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ScheduleCalendar from '@/components/schedule-calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { CardSkeleton } from '@/components/skeletons';
import { isSubscriptionActiveByEndDate } from '@/lib/date';

interface Course {
  id: number;
  scheduleId: number;
  classId: number;
  trainerId: number;
  courseDate: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: number;
    name: string;
  };
  trainer?: {
    id: number;
  };
}


export default function AdminCourses() {
  console.log('AdminCourses page loaded');
  const [calendarView, setCalendarView] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleNavigateToDate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleCourseClick = (courseId: number) => {
    router.push(`/admin/courses/${courseId}`);
  };

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Debug: Log date range
  console.log('Courses query date range:', startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]);

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useCourses();


  // Debug: Log loading and error state
  console.log('coursesLoading:', coursesLoading, 'coursesError:', coursesError);

  // Debug: Log raw courses
  console.log('Raw courses:', courses);
  console.log('Raw courses type:', typeof courses);
  console.log('Raw courses length:', courses?.length);
  if (courses && courses.length > 0) {
    console.log('First course example:', courses[0]);
  }

  // Fetch classes for dropdown

  // Fetch trainers for dropdown

  // Fetch registrations and checkins for the calendar
  const { data: registrations = [] } = useAdminRegistrations();

  const { data: checkins = [] } = useAdminCheckins();

  // Fetch members
  const { data: members = [] } = useMembers();
  
  // Fetch subscriptions
  const { data: subscriptions = [] } = useAdminSubscriptions();

  // Filter members to only those with an active subscription
  const activeMembers = members.filter((member: any) => {
    const sub = subscriptions.find(
      (s: any) =>
        s.member_id === member.id &&
        s.status === 'active' &&
        isSubscriptionActiveByEndDate(s.end_date) &&
        s.subscription_group_sessions &&
        s.subscription_group_sessions.some((sgs: any) => sgs.sessions_remaining > 0)
    );
    
    // Debug logging
    if (!sub) {
      const memberSub = subscriptions.find((s: any) => s.member_id === member.id);
      console.log(`Member ${member.first_name} ${member.last_name} (${member.id}) filtered out:`, {
        hasSubscription: !!memberSub,
        subscriptionStatus: memberSub?.status,
        endDate: memberSub?.end_date,
        hasGroupSessions: memberSub?.subscription_group_sessions?.length > 0,
        groupSessionsRemaining: memberSub?.subscription_group_sessions?.map((sgs: any) => sgs.sessions_remaining) || [],
        isExpired: memberSub ? !isSubscriptionActiveByEndDate(memberSub.end_date) : true
      });
    } else {
      console.log(`Member ${member.first_name} ${member.last_name} (${member.id}) included:`, {
        subscriptionId: sub.id,
        status: sub.status,
        endDate: sub.end_date,
        groupSessionsRemaining: sub.subscription_group_sessions?.map((sgs: any) => sgs.sessions_remaining) || []
      });
    }
    
    return !!sub;
  });

  // Update course mutation

  // Delete course mutation

  // Convert courses to the format expected by ScheduleCalendar
  const coursesAsSchedules = courses?.map((course: any) => ({
    id: course.id,
    dayOfWeek: new Date(course.course_date).getDay(),
    startTime: course.start_time,
    endTime: course.end_time,
    scheduleDate: course.course_date,
    repetitionType: 'once',
    isActive: course.is_active,
    class: {
      id: course.class?.id || 0,
      name: course.class?.name || 'Unknown Class',
      category: course.class?.name || 'Unknown',
      duration: 60,
      maxCapacity: course.max_participants,
    },
    trainer: {
      id: course.trainer?.id || 0,
      firstName: (course.trainer as any)?.user?.first_name || '',
      lastName: (course.trainer as any)?.user?.last_name || '',
    },
  })) || [];

  // Debug: Log mapped coursesAsSchedules
  console.log('Mapped coursesAsSchedules:', coursesAsSchedules);



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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Courses Calendar</h1>
        <div className="flex gap-2">
          <Badge variant="outline">
            {courses?.length || 0} courses
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <ScheduleCalendar
            schedules={coursesAsSchedules}
            registrations={registrations || []}
            checkins={checkins || []}
            members={activeMembers || []}
            subscriptions={subscriptions || []}
            viewMode={isMobile ? 'daily' : calendarView}
            onViewModeChange={isMobile ? () => {} : setCalendarView}
            onNavigateToDate={handleNavigateToDate}
            onCourseClick={handleCourseClick}
            currentDate={currentDate}
            hideViewModeSwitcher={isMobile}
          />
        </CardContent>
      </Card>
    </div>
  );
}
