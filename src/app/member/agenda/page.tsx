"use client";

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemberCourses } from '@/hooks/useMemberCourses';
import { useMemberSubscriptions } from '@/hooks/useMemberSubscriptions';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { ClientContainer } from '@/calendar/components/client-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons';

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

// Convert courses to big-calendar events format
const convertCoursesToEvents = (courses: any[]) => {
  if (!courses) return [];

  return courses.map((course: any) => {
    const instructorName = course.trainer?.user ? 
      `${course.trainer.user.first_name} ${course.trainer.user.last_name}` : 
      'Unknown Trainer';

    // Create start and end dates
    const startDate = new Date(`${course.courseDate}T${course.startTime}`);
    const endDate = new Date(`${course.courseDate}T${course.endTime}`);

    // Generate color based on category
    const getColor = (categoryName?: string): "blue" | "green" | "red" | "yellow" | "purple" | "orange" => {
      const colors = ["blue", "green", "red", "yellow", "purple", "orange"];
      if (!categoryName) return "blue";
      const hash = categoryName.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return colors[Math.abs(hash) % colors.length] as "blue" | "green" | "red" | "yellow" | "purple" | "orange";
    };

    return {
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nDifficulty: ${course.class?.difficulty || 'Unknown'}\nDuration: ${course.class?.duration || 60} minutes`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: getColor(course.class?.category?.name),
      user: {
        id: course.trainer?.id?.toString() || 'unknown',
        name: instructorName,
        picturePath: null
      }
    };
  });
};

export default function MemberAgenda() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'week';
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useMemberCourses();
  const { data: subscription } = useMemberSubscriptions();

  // Convert courses to events
  const events = useMemo(() => {
    const convertedEvents = convertCoursesToEvents(courses || []);
    console.log('=== MEMBER AGENDA EVENTS DEBUG ===');
    console.log('Courses count:', courses?.length || 0);
    console.log('Converted events count:', convertedEvents.length);
    console.log('Events:', convertedEvents);
    return convertedEvents;
  }, [courses]);

  // Create a single user for the member
  const users = useMemo(() => {
    return [{
      id: 'member',
      name: 'My Classes',
      picturePath: null
    }];
  }, []);

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
          <h1 className="text-3xl font-bold text-foreground">My Class Schedule</h1>
          <p className="text-muted-foreground mt-1">View and manage your class registrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {events.length} classes
          </Badge>
          {subscription && subscription.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {(subscription[0] as any).sessions_remaining || 0} sessions left
            </Badge>
          )}
        </div>
      </div>

      {/* Big Calendar */}
      <CalendarProvider users={users} events={events}>
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4">
          <ClientContainer view={view as any} />
        </div>
      </CalendarProvider>
    </div>
  );
}
