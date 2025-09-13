"use client";

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCourses } from '@/hooks/useCourse';
import { useClasses } from '@/hooks/useClasses';
import { useTrainers } from '@/hooks/useTrainers';
import { useAdminRegistrations, useAdminCheckins, useAdminSubscriptions } from '@/hooks/useAdmin';
import { useMembers } from '@/hooks/useMembers';
import { CalendarProvider } from '@/calendar/contexts/calendar-context';
import { ClientContainer } from '@/calendar/components/client-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons';

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
    description: string;
    category_id: number;
    duration: number;
    max_capacity: number;
    category?: {
      id: number;
      name: string;
      color: string;
    };
  };
  trainer?: {
    id: number;
    account_id: string;
    specialization: string;
    experience_years: number;
    bio: string;
    certification: string;
    status: string;
  };
  schedule?: {
    id: number;
    class_id: number;
    trainer_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_participants: number;
    repetition_type: string;
    schedule_date: string;
    is_active: boolean;
  };
}

// Convert courses to big-calendar events format
const convertCoursesToEvents = (courses: any[]) => {
  if (!courses) return [];

  return courses.map((course: any) => {
    const instructorName = course.trainer?.specialization || 'Unknown Trainer';

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
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nParticipants: ${course.currentParticipants}/${course.maxParticipants}\nStatus: ${course.status}`,
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
      } : undefined
    };
  });
};

export default function AdminAgenda() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'week';
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: classes } = useClasses();
  const { data: trainers } = useTrainers();
  const { data: registrations = [] } = useAdminRegistrations();
  const { data: checkins = [] } = useAdminCheckins();
  const { data: members = [] } = useMembers();
  const { data: subscriptions = [] } = useAdminSubscriptions();

  // Convert courses to events
  const events = useMemo(() => {
    return convertCoursesToEvents(courses || []);
  }, [courses]);

  // Create users from trainers
  const users = useMemo(() => {
    if (!trainers) return [];
    return trainers.map((trainer: any) => ({
      id: trainer.id.toString(),
      name: trainer.specialization || 'Unknown Trainer',
      picturePath: null
    }));
  }, [trainers]);

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
            <h3 className="text-lg font-medium mb-2">Error loading courses</h3>
            <p className="text-muted-foreground">There was an error loading the course schedule. Please try again.</p>
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
          <h1 className="text-3xl font-bold text-foreground">Course Agenda</h1>
          <p className="text-muted-foreground mt-1">Manage and view all course schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {events.length} courses
          </Badge>
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
