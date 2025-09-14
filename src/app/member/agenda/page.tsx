"use client";

import React, { useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemberCourses } from '@/hooks/useMemberCourses';
import { useMemberSubscriptions } from '@/hooks/useMemberSubscriptions';
import { useMemberRegistrations } from '@/hooks/useMemberRegistrations';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { ClientContainer } from '@/calendar/components/client-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons';
import { convertCoursesToMemberEvents, createMemberUsers } from '@/calendar/utils/course-converter';

interface Course {
  id: number;
  class: {
    id: number;
    name: string;
    description: string;
    category: {
      id: number;
      name: string;
      color: string;
    };
    difficulty: string;
    maxCapacity: number;
    duration: number;
  };
  trainer: {
    id: number;
    user: {
      first_name: string;
      last_name: string;
    };
  };
  courseDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  scheduleId: number;
}



function MemberAgenda() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'day';
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useMemberCourses();
  const { data: subscription } = useMemberSubscriptions();
  const { data: registrations } = useMemberRegistrations();

  // Convert courses to events
  const events = useMemo(() => {
    const convertedEvents = convertCoursesToMemberEvents(courses || [], registrations || []);
    console.log('=== MEMBER AGENDA EVENTS DEBUG ===');
    console.log('Courses count:', courses?.length || 0);
    console.log('Registrations count:', registrations?.length || 0);
    console.log('Converted events count:', convertedEvents.length);
    console.log('Events with registration status:', convertedEvents);
    return convertedEvents;
  }, [courses, registrations]);

  // Create a single user for the member
  const users = useMemo(() => createMemberUsers(), []);

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
    <div className="container mx-auto p-6 space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Class Schedule</h1>
          <p className="text-muted-foreground mt-1">View and manage your class registrations</p>
        </div>
      </div>

      {/* Big Calendar */}
      <CalendarProvider users={users} events={events} registrations={registrations || []}>
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 h-[calc(100vh-200px)] min-h-[1200px]">
          <ClientContainer view={view as any} />
        </div>
      </CalendarProvider>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MemberAgenda />
    </Suspense>
  );
}
