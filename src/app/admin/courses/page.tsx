"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCourses, useUpdateCourse, useDeleteCourse } from '@/hooks/useCourse';
import { useClasses } from '@/hooks/useClasses';
import { useTrainers } from '@/hooks/useTrainers';
import { Class } from '@/lib/api/classes';
import { Trainer } from '@/lib/api/trainers';
import { useAdminRegistrations, useAdminCheckins, useAdminSubscriptions } from '@/hooks/useAdmin';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ScheduleCalendar from '@/components/schedule-calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
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
  };
  trainer?: {
    id: number;
  };
}


export default function AdminCourses() {
  console.log('AdminCourses page loaded');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
  const { data: classes } = useClasses();

  // Fetch trainers for dropdown
  const { data: trainers } = useTrainers();

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
        new Date(s.end_date) > new Date() &&
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
        isExpired: memberSub ? new Date(memberSub.end_date) <= new Date() : true
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
  const updateCourseMutation = useUpdateCourse();

  // Delete course mutation
  const deleteCourseMutation = useDeleteCourse();

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

  const handleUpdateCourse = (formData: any) => {
    if (!selectedCourse) return;

    const updateData = {
      schedule_id: selectedCourse.scheduleId,
      class_id: formData.class_id,
      trainer_id: formData.trainer_id,
      course_date: formData.course_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      max_participants: formData.max_participants,
      current_participants: formData.current_participants,
      status: formData.status,
      is_active: formData.is_active,
    };

    updateCourseMutation.mutate({ 
      courseId: selectedCourse.id, 
      data: updateData 
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedCourse(null);
      }
    });
  };

  const handleDeleteCourse = () => {
    if (!selectedCourse) return;
    deleteCourseMutation.mutate(selectedCourse.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedCourse(null);
      }
    });
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

      {/* Edit Course Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <CourseEditForm
              course={selectedCourse}
              classes={classes || []}
              trainers={trainers || []}
              activeMembers={activeMembers}
              onSubmit={handleUpdateCourse}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this course?</p>
            <p className="text-sm text-gray-600">
              This action cannot be undone. The course will be permanently removed.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteCourse}
                disabled={deleteCourseMutation.isPending}
              >
                {deleteCourseMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CourseEditFormProps {
  course: Course;
  classes: Class[];
  trainers: Trainer[];
  activeMembers: any[]; // NEW
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function CourseEditForm({ course, classes, trainers, activeMembers, onSubmit, onCancel }: CourseEditFormProps) {
  const [formData, setFormData] = useState({
    class_id: course.classId,
    trainer_id: course.trainerId,
    course_date: course.courseDate,
    start_time: course.startTime,
    end_time: course.endTime,
    max_participants: course.maxParticipants,
    current_participants: course.currentParticipants,
    status: course.status,
    is_active: course.isActive,
    member_id: "", // NEW
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="class_id">Class</Label>
          <Select
            value={formData.class_id.toString()}
            onValueChange={(value) => setFormData({ ...formData, class_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="trainer_id">Trainer</Label>
          <Select
            value={formData.trainer_id.toString()}
            onValueChange={(value) => setFormData({ ...formData, trainer_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={trainer.id.toString()}>
                  Trainer {trainer.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Member select for registration (only active members) */}
      <div>
        <Label htmlFor="member_id">Member (with active subscription)</Label>
        <Select
          value={formData.member_id?.toString() || ""}
          onValueChange={(value) => setFormData({ ...formData, member_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {activeMembers.map((member: any) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name || member.firstName} {member.last_name || member.lastName} ({member.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="course_date">Date</Label>
        <Input
          id="course_date"
          type="date"
          value={formData.course_date}
          onChange={(e) => setFormData({ ...formData, course_date: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="max_participants">Max Participants</Label>
          <Input
            id="max_participants"
            type="number"
            value={formData.max_participants}
            onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="current_participants">Current Participants</Label>
          <Input
            id="current_participants"
            type="number"
            value={formData.current_participants}
            onChange={(e) => setFormData({ ...formData, current_participants: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit">Update Course</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
} 