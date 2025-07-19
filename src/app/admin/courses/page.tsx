"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ScheduleCalendar from '@/components/schedule-calendar';

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

interface Class {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  duration: number;
  max_capacity: number;
  equipment?: string;
  is_active: boolean;
  created_at: string;
}

interface Trainer {
  id: number;
  user_id: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  certification?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCourses() {
  console.log('AdminCourses page loaded');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();

  const handleNavigateToDate = (date: Date) => {
    setCurrentDate(date);
  };

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Debug: Log date range
  console.log('Courses query date range:', startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]);

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ["/api/courses"],
    queryFn: () => apiRequest("GET", "/api/courses"),
  });

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
  const { data: classes } = useQuery({
    queryKey: ["/api/admin/classes"],
    queryFn: () => apiRequest("GET", "/api/admin/classes"),
  });

  // Fetch trainers for dropdown
  const { data: trainers } = useQuery({
    queryKey: ["/api/trainers"],
    queryFn: () => apiRequest("GET", "/api/trainers"),
  });

  // Fetch registrations and checkins for the calendar
  const { data: registrations = [] } = useQuery({
    queryKey: ["/api/registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["/api/checkins"],
    queryFn: () => apiRequest("GET", "/api/checkins"),
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PUT', `/api/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
      setIsEditModalOpen(false);
      setSelectedCourse(null);
    },
    onError: (error) => {
      toast.error('Failed to update course');
      console.error('Error updating course:', error);
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedCourse(null);
    },
    onError: (error) => {
      toast.error('Failed to delete course');
      console.error('Error deleting course:', error);
    },
  });

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

    updateCourseMutation.mutate({ id: selectedCourse.id, data: updateData });
  };

  const handleDeleteCourse = () => {
    if (!selectedCourse) return;
    deleteCourseMutation.mutate(selectedCourse.id);
  };

  if (coursesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading courses...</div>
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
            viewMode={calendarView}
            onViewModeChange={setCalendarView}
            onNavigateToDate={handleNavigateToDate}
            currentDate={currentDate}
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
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function CourseEditForm({ course, classes, trainers, onSubmit, onCancel }: CourseEditFormProps) {
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