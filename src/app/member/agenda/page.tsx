"use client";

import React, { useMemo } from 'react';
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

export default function MemberAgenda() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'week';
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useMemberCourses();
  const { data: subscription } = useMemberSubscriptions();
  const { data: registrations } = useMemberRegistrations();

  // Convert courses to events
  const events = useMemo(() => {
    const convertedEvents = convertCoursesToEvents(courses || [], registrations || []);
    console.log('=== MEMBER AGENDA EVENTS DEBUG ===');
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
      </div>

      {/* Big Calendar */}
      <CalendarProvider users={users} events={events} registrations={registrations || []}>
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-4">
          <ClientContainer view={view as any} />
        </div>
      </CalendarProvider>
    </div>
  );
}
