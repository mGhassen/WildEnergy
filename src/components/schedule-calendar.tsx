import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, Plus, Search, X, Check, XCircle } from 'lucide-react';
import { formatDate, formatTime, formatLongDate, getDayName, getShortDayName } from '@/lib/date';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBulkRegisterMembers, useValidateCheckin, useUnvalidateCheckin, useAdminCancelRegistration } from '@/hooks/useRegistrations';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';

interface Schedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  scheduleDate: string;
  repetitionType: string;
  parentScheduleId?: number;
  isActive: boolean;
  class: {
    id: number;
    name: string;
    category: string;
    duration: number;
    maxCapacity: number;
  };
  trainer: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Registration {
  id: number;
  registrationDate: string;
  qrCode: string;
  status: string;
  member: {
    id: number;
    first_name?: string;
    last_name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  course: {
    id: number;
    courseDate: string;
    startTime: string;
    endTime: string;
    scheduleId: number;
    classId: number;
    trainerId: number;
    schedule?: {
      id: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    };
    class?: {
      id: number;
      name: string;
      category: string;
    };
    trainer?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
}

interface Checkin {
  id: number;
  checkinTime: string;
  sessionConsumed: boolean;
  member: {
    id: number;
    firstName: string;
    lastName: string;
  };
  registration: {
    id: number;
    course: {
      id: number;
      courseDate: string;
      startTime: string;
      endTime: string;
      scheduleId: number;
      classId: number;
      trainerId: number;
      schedule?: {
        id: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      };
      class?: {
        id: number;
        name: string;
        category: string;
      };
      trainer?: {
        id: number;
        firstName: string;
        lastName: string;
      };
    };
  };
}

interface ScheduleCalendarProps {
  schedules: Schedule[];
  registrations: Registration[];
  checkins: Checkin[];
  members?: any[];
  subscriptions?: any[];
  viewMode: "daily" | "weekly" | "monthly";
  onViewModeChange: (mode: "daily" | "weekly" | "monthly") => void;
  onNavigateToDate?: (date: Date) => void;
  onCourseClick?: (courseId: number) => void;
  currentDate?: Date;
  hideViewModeSwitcher?: boolean;
}

export default function ScheduleCalendar({ 
  schedules, 
  registrations, 
  checkins, 
  members = [],
  subscriptions = [],
  viewMode, 
  onViewModeChange,
  onNavigateToDate,
  onCourseClick,
  currentDate: externalCurrentDate,
  hideViewModeSwitcher = false
}: ScheduleCalendarProps) {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const currentDate = externalCurrentDate || internalCurrentDate;
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Add state for confirmation dialogs
  const [confirmUnregisterId, setConfirmUnregisterId] = useState<string | number | null>(null);
  const [confirmUnvalidateId, setConfirmUnvalidateId] = useState<string | number | null>(null);
  const [adminRefundSession, setAdminRefundSession] = useState(true);

  // Calculate if cancellation is late (within 24h of course start)
  const isLateCancellation = (registrationId: number) => {
    const registration = registrations.find(reg => reg.id === registrationId);
    if (!registration?.course) return false;
    
    const courseDateTime = new Date(`${registration.course.courseDate}T${registration.course.startTime}`);
    const cutoffTime = new Date(courseDateTime.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    
    return now >= cutoffTime;
  };

  const getScheduleRegistrations = (scheduleId: number) => {
    // Get all registrations for this schedule
    const scheduleRegistrations = registrations.filter(reg => 
      reg.course?.id === scheduleId && 
      reg.status === 'registered'
    );
    
    // Get all check-ins for this schedule
    const scheduleCheckins = checkins.filter(checkin => 
      checkin.registration?.course?.id === scheduleId
    );
    
    // Create a set of registration IDs that have been checked in
    const checkedInRegistrationIds = new Set(
      scheduleCheckins.map(checkin => checkin.registration?.id).filter(Boolean)
    );
    
    // Return only registrations that are NOT checked in
    return scheduleRegistrations.filter(reg => !checkedInRegistrationIds.has(reg.id));
  };

  const getAllScheduleRegistrations = (scheduleId: number) => {
    // Get ALL registrations for this schedule (including checked-in ones)
    return registrations.filter(reg => 
      reg.course?.id === scheduleId && 
      (reg.status === 'registered' || reg.status === 'attended')  // Include both registered and attended (checked-in) members
    );
  };

  const getScheduleCheckins = (scheduleId: number) => {
    return checkins.filter(checkin => 
      checkin.registration?.course?.id === scheduleId
    );
  };

  const isCourseInPast = (schedule: Schedule) => {
    if (!schedule.scheduleDate) return false;
    const courseDateTime = new Date(`${schedule.scheduleDate}T${schedule.endTime}`);
    const now = new Date();
    return courseDateTime < now;
  };

  // Members and subscriptions are now passed as props to avoid unauthorized API calls

  // Helper: does member have an active subscription?
  function hasActiveSubscription(memberId: string | number) {
    return subscriptions.some((sub: any) =>
      sub.user_id === memberId &&
      sub.status === 'active' &&
      new Date(sub.end_date) > new Date() &&
      sub.sessions_remaining > 0
    );
  }

  // Get registered and checked-in member IDs for the current course
  const getRegisteredMemberIds = (scheduleId: number) => {
    const courseRegistrations = registrations.filter(reg => 
      reg.course?.id === scheduleId && 
      reg.status === 'registered'  // Only include active registrations, exclude cancelled ones
    );
    const registeredIds = courseRegistrations.map(reg => reg.member?.id).filter(Boolean);
    return registeredIds;
  };

  const getCheckedInMemberIds = (scheduleId: number) => {
    const courseCheckins = checkins.filter(checkin => checkin.registration?.course?.id === scheduleId);
    const checkedInIds = courseCheckins.map(checkin => checkin.member?.id).filter(Boolean);
    return checkedInIds;
  };

  // Filter members based on search term, eligibility, and active subscription
  const filteredMembers = members.filter((member: any) => {
    // Only show active members
    if (member.status !== 'active') {
      return false;
    }

    // Must have at least one active subscription
    if (!hasActiveSubscription(member.id)) {
      return false;
    }

    // Skip if already registered for this course
    if (selectedSchedule) {
      const registeredIds = getRegisteredMemberIds(selectedSchedule.id);
      const memberIdStr = String(member.id);
      const isRegistered = registeredIds.some(id => String(id) === memberIdStr);
      if (isRegistered) {
        return false;
      }
    }

    // Skip if already checked in for this course
    if (selectedSchedule) {
      const checkedInIds = getCheckedInMemberIds(selectedSchedule.id);
      const memberIdStr = String(member.id);
      const isCheckedIn = checkedInIds.some(id => String(id) === memberIdStr);
      if (isCheckedIn) {
        return false;
      }
    }

    // Apply search filter
    const searchLower = memberSearchTerm.toLowerCase();
    const matchesSearch = (
      member.firstName?.toLowerCase().includes(searchLower) ||
      member.lastName?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
    return matchesSearch;
  });

  // Admin registration mutation
  const registerMembersMutation = useBulkRegisterMembers();

  // Validate check-in mutation
  const validateCheckinMutation = useValidateCheckin();

  // Unvalidate check-in mutation
  const unvalidateCheckinMutation = useUnvalidateCheckin();

  // Add unregister mutation
  const unregisterMemberMutation = useAdminCancelRegistration();

  const handleRegisterMembers = () => {
    if (!selectedSchedule || selectedMembers.length === 0) return;
    
    registerMembersMutation.mutate({
      courseId: selectedSchedule.id,
      memberIds: selectedMembers
    });
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "daily") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    if (externalCurrentDate && onNavigateToDate) {
      onNavigateToDate(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const getDateRange = () => {
    if (viewMode === "daily") {
      return formatDate(currentDate);
    } else if (viewMode === "weekly") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    } else {
      return formatLongDate(currentDate);
    }
  };

  const isScheduleVisibleOnDate = (schedule: any, targetDate: Date): boolean => {
    // Handle "once" schedules - only show on exact date
    if (schedule.repetitionType === 'once') {
      if (schedule.scheduleDate) {
        const scheduleDate = new Date(schedule.scheduleDate);
        return scheduleDate.toDateString() === targetDate.toDateString();
      }
      return false;
    }
    
    // Handle repeating schedules - these should have been created as individual instances
    // So just check if the schedule date matches the target date
    if (schedule.scheduleDate) {
      const scheduleDate = new Date(schedule.scheduleDate);
      return scheduleDate.toDateString() === targetDate.toDateString();
    }
    
    return false;
  };

  const getVisibleSchedules = () => {
    if (!schedules || schedules.length === 0) {
      console.log("No schedules available");
      return [];
    }

    console.log("All schedules:", schedules);
    console.log("Current date:", currentDate, "View mode:", viewMode);

    if (viewMode === "daily") {
      // For daily view, show only schedules for the exact current date
      const filtered = schedules.filter(schedule => 
        isScheduleVisibleOnDate(schedule, currentDate)
      );
      console.log("Daily filtered schedules:", filtered);
      return filtered;
    }
    
    if (viewMode === "weekly") {
      // For weekly view, show schedules for any day in the current week
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const filtered = schedules.filter(schedule => {
        if (schedule.scheduleDate) {
          const scheduleDate = new Date(schedule.scheduleDate);
          return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek;
        }
        return false;
      });
      console.log("Weekly filtered schedules:", filtered);
      return filtered;
    }
    
    if (viewMode === "monthly") {
      // For monthly view, show schedules for any day in the current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const filtered = schedules.filter(schedule => {
        if (schedule.scheduleDate) {
          const scheduleDate = new Date(schedule.scheduleDate);
          return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === month;
        }
        return false;
      });
      console.log("Monthly filtered schedules:", filtered);
      return filtered;
    }

    return [];
  };

  const renderDailyView = () => {
    const daySchedules = getVisibleSchedules();
    
    return (
      <div className="space-y-4">
        {daySchedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No classes scheduled for this day
          </div>
        ) : (
          daySchedules.map((schedule) => {
            const registeredMembers = getScheduleRegistrations(schedule.id);
            const attendedMembers = getScheduleCheckins(schedule.id);
            const isPast = isCourseInPast(schedule);
            
            return (
              <Card key={schedule.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isPast ? 'opacity-60 bg-gray-50' : ''}`}
                    onClick={() => onCourseClick ? onCourseClick(schedule.id) : setSelectedSchedule(schedule)}>
                <CardContent className={isMobile ? 'p-2' : 'p-4'}>
                  <div className={isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}>
                    <div className={isMobile ? '' : 'flex-1'}>
                      <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</h3>
                      <p className={`${isPast ? 'text-gray-400' : 'text-muted-foreground'} ${isMobile ? 'text-xs' : ''}`}>
                        {schedule.trainer?.firstName || 'Unknown'} {schedule.trainer?.lastName || ''}
                      </p>
                      <div className={isMobile ? 'flex flex-col gap-1 mt-1 text-xs text-muted-foreground' : 'flex items-center gap-4 mt-2 text-sm text-muted-foreground'}>
                        <div className="flex items-center gap-1">
                          <Clock className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                          {getAllScheduleRegistrations(schedule.id).length}/{schedule.class?.maxCapacity || 0} registered
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                          {attendedMembers.length} attended
                        </div>
                      </div>
                    </div>
                    <div className={isMobile ? 'mt-2 text-left' : 'text-right space-y-2'}>
                      <Badge variant={isPast ? 'outline' : 'secondary'} className={isMobile ? 'text-xs' : ''}>
                        {schedule.class.category}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, dayIndex) => {
          const dayStr = day.toISOString().split('T')[0];
          const daySchedules = schedules.filter(schedule => {
            // For schedules without scheduleDate, use dayOfWeek
            if (!schedule.scheduleDate) {
              return schedule.dayOfWeek === day.getDay();
            }
            const scheduleDate = new Date(schedule.scheduleDate).toISOString().split('T')[0];
            return scheduleDate === dayStr;
          });
          
          const dayName = getShortDayName(day.getDay());
          const dayNumber = day.getDate();
          
          return (
            <Card key={dayIndex} className="h-96 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {dayName} {dayNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2 flex-1 overflow-y-auto">
                {daySchedules.map((schedule) => {
                  const registeredMembers = getScheduleRegistrations(schedule.id);
                  const attendedMembers = getScheduleCheckins(schedule.id);
                  const isPast = isCourseInPast(schedule);
                  
                  return (
                    <div key={schedule.id} 
                         className={`p-2 rounded text-xs cursor-pointer ${
                           isPast 
                             ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                             : 'bg-primary/10 hover:bg-primary/20'
                         }`}
                         onClick={() => onCourseClick ? onCourseClick(schedule.id) : setSelectedSchedule(schedule)}>
                      <div className={`font-medium truncate ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</div>
                      <div className={isPast ? 'text-gray-400' : 'text-muted-foreground'}>{formatTime(schedule.startTime)}</div>
                      <div className="flex justify-between mt-1">
                        <span className={isPast ? 'text-gray-400' : ''}>{getAllScheduleRegistrations(schedule.id).length}/{schedule.class?.maxCapacity || 0}</span>
                        <span className={isPast ? 'text-gray-400' : 'text-green-600'}>{attendedMembers.length}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    const currentWeekDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentWeekDate);
        
        // Filter schedules for this specific day
        const daySchedules = schedules.filter(schedule => 
          isScheduleVisibleOnDate(schedule, date)
        );
        
        const isCurrentMonth = date.getMonth() === month;
        
        days.push({
          date: new Date(date),
          schedules: daySchedules,
          isCurrentMonth
        });
        
        currentWeekDate.setDate(currentWeekDate.getDate() + 1);
      }
      weeks.push(days);
      
      if (currentWeekDate > lastDay) break;
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
            <div key={dayIndex} className="p-2 text-center font-medium text-muted-foreground">
              {getShortDayName(dayIndex)}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => (
              <Card key={dayIndex} className={`min-h-24 ${!day.isCurrentMonth ? 'opacity-50' : ''}`}>
                <CardContent className="p-2">
                  <div className="text-sm font-medium mb-1">
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {day.schedules.slice(0, 2).map((schedule) => {
                      const registeredMembers = getScheduleRegistrations(schedule.id);
                      const attendedMembers = getScheduleCheckins(schedule.id);
                      const isPast = isCourseInPast(schedule);
                      
                      return (
                        <div key={schedule.id} 
                             className={`text-xs p-1 rounded cursor-pointer ${
                               isPast 
                                 ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                                 : 'bg-primary/10 hover:bg-primary/20'
                             }`}
                             onClick={() => onCourseClick ? onCourseClick(schedule.id) : setSelectedSchedule(schedule)}>
                          <div className={`truncate font-medium ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</div>
                          <div className="flex justify-between">
                            <span className={isPast ? 'text-gray-400' : ''}>{formatTime(schedule.startTime)}</span>
                            <span className={isPast ? 'text-gray-400' : ''}>{getAllScheduleRegistrations(schedule.id).length}/{schedule.class?.maxCapacity || 0}</span>
                          </div>
                          <div className={`text-xs ${isPast ? 'text-gray-400' : 'text-green-600'}`}>
                            {attendedMembers.length} attended
                          </div>
                        </div>
                      );
                    })}
                    {day.schedules.length > 2 && (
                      <div 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToDate) {
                            onNavigateToDate(day.date);
                            onViewModeChange('daily');
                          }
                        }}
                      >
                        +{day.schedules.length - 2} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Update adminRefundSession when dialog opens
  const handleUnregisterClick = (registrationId: number) => {
    const isLate = isLateCancellation(registrationId);
    setAdminRefundSession(!isLate); // Default: refund if not late, forfeit if late
    setConfirmUnregisterId(registrationId);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{getDateRange()}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const today = new Date();
                if (externalCurrentDate && onNavigateToDate) {
                  onNavigateToDate(today);
                } else {
                  setInternalCurrentDate(today);
                }
              }}
              className="px-3"
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {!hideViewModeSwitcher && (
          <div className="flex items-center gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Views */}
      {viewMode === "daily" && renderDailyView()}
      {viewMode === "weekly" && renderWeeklyView()}
      {viewMode === "monthly" && renderMonthlyView()}

      {/* Schedule Detail Dialog */}
      {selectedSchedule && (
        <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSchedule.class?.name || 'Unknown Class'}</DialogTitle>
              <DialogDescription>
                {formatLongDate(selectedSchedule.scheduleDate)} • {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Class Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>Trainer: {selectedSchedule.trainer?.firstName || 'Unknown'} {selectedSchedule.trainer?.lastName || ''}</div>
                    <div>Category: {selectedSchedule.class?.category || 'Unknown'}</div>
                    <div>Duration: {selectedSchedule.class?.duration || 60} minutes</div>
                    <div>Capacity: {selectedSchedule.class?.maxCapacity || 0} members</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Attendance Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div>Registered: {getAllScheduleRegistrations(selectedSchedule.id).length}</div>
                    <div>Attended: {getScheduleCheckins(selectedSchedule.id).length}</div>
                    <div>Attendance Rate: {
                      (() => {
                        const attended = getScheduleCheckins(selectedSchedule.id).length;
                        const registered = getAllScheduleRegistrations(selectedSchedule.id).length;
                        const maxCapacity = selectedSchedule.class?.maxCapacity || 0;
                        
                        const capacityRate = maxCapacity > 0 ? Math.round((attended / maxCapacity) * 100) : 0;
                        const registeredRate = registered > 0 ? Math.round((attended / registered) * 100) : 0;
                        
                        return `${capacityRate}% / ${registeredRate}%`;
                      })()
                    }</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Registered Members ({getAllScheduleRegistrations(selectedSchedule.id).length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getAllScheduleRegistrations(selectedSchedule.id).map((registration) => {
                    // Check if this registration has been checked in
                    const checkin = checkins.find(c => c.registration?.id === registration.id);
                    const isCheckedIn = !!checkin;
                    const memberName = `${registration.member?.first_name || registration.member?.firstName || ''} ${registration.member?.last_name || registration.member?.lastName || ''}`.trim();
                    const memberEmail = registration.member?.email || 'No email';
                    const checkinTime = checkin ? formatTime(checkin.checkinTime) : '';
                    return (
                      <div key={registration.id} className={`flex items-center justify-between p-2 rounded ${isCheckedIn ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                        <div>
                          <div className="font-medium">{memberName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{memberEmail}</div>
                          {isCheckedIn && (
                            <div className="text-xs text-green-600">Checked in at {checkinTime}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isCheckedIn ? 'default' : 'secondary'} className={isCheckedIn ? 'bg-green-600' : ''}>
                            {isCheckedIn ? 'Checked In' : 'Registered'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 p-0"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isCheckedIn && (
                                <DropdownMenuItem onClick={() => validateCheckinMutation.mutate(registration.id)} disabled={validateCheckinMutation.isPending}>
                                  <Check className="w-3 h-3 mr-2" /> Validate
                                </DropdownMenuItem>
                              )}
                              {!isCheckedIn && (
                                <DropdownMenuItem onClick={() => handleUnregisterClick(registration.id)}>
                                  <X className="w-3 h-3 mr-2" /> Unregister
                                </DropdownMenuItem>
                              )}
                              {isCheckedIn && (
                                <DropdownMenuItem onClick={() => setConfirmUnvalidateId(registration.id)}>
                                  <XCircle className="w-3 h-3 mr-2" /> Unvalidate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                  {getAllScheduleRegistrations(selectedSchedule.id).length === 0 && (
                    <div className="text-muted-foreground text-sm">No members registered</div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Member Registration Modal */}
      <Dialog open={isRegistrationModalOpen} onOpenChange={setIsRegistrationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Register Members to Course</DialogTitle>
            <DialogDescription>
              Select active members with at least an active subscription to register for {selectedSchedule?.class?.name} on {selectedSchedule?.scheduleDate ? formatDate(selectedSchedule.scheduleDate) : 'Unknown Date'}. Only eligible members (active, not registered, not checked in, with active subscription) are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name or email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected count */}
            {selectedMembers.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
                <span className="text-sm font-medium">
                  {selectedMembers.length} member(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMembers([])}
                  className="h-6 px-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            {/* Members list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredMembers.map((member: any) => (
                <div
                  key={member.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMembers.includes(member.id)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleMemberToggle(member.id)}
                >
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {member.firstName || member.first_name || ''} {member.lastName || member.last_name || ''}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </div>
                  </div>
                  <Badge variant={member.member_status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {memberSearchTerm ? (
                    'No eligible members found matching your search'
                  ) : (
                    <div className="space-y-2">
                      <p>No eligible members available for registration</p>
                      <p className="text-xs">Only active members who are not already registered or checked in are shown</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedMembers.length} member(s) selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRegistrationModalOpen(false);
                  setSelectedMembers([]);
                  setMemberSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegisterMembers}
                disabled={selectedMembers.length === 0 || registerMembersMutation.isPending}
              >
                {registerMembersMutation.isPending ? 'Registering...' : `Register ${selectedMembers.length} Member(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unregister Confirmation Dialog */}
      <AlertDialog open={!!confirmUnregisterId} onOpenChange={open => !open && setConfirmUnregisterId(null)}>
        <AlertDialogTrigger asChild />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unregister Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unregister this member from the course? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {user?.isAdmin && confirmUnregisterId && (
            <div className="space-y-3 py-2">
              {isLateCancellation(Number(confirmUnregisterId)) ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ Late Cancellation</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    This is a late cancellation (within 24 hours of the course). 
                    By default, the session will be forfeited.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 font-medium">✅ Regular Cancellation</p>
                  <p className="text-xs text-green-700 mt-1">
                    This is not a late cancellation. By default, the session will be refunded.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="admin-refund-session"
                  checked={adminRefundSession}
                  onCheckedChange={checked => setAdminRefundSession(!!checked)}
                />
                <Label htmlFor="admin-refund-session">
                  {isLateCancellation(Number(confirmUnregisterId)) ? 'Override: Refund session to member' : 'Refund session to member'}
                </Label>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmUnregisterId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUnregisterId) {
                  const isLate = isLateCancellation(Number(confirmUnregisterId));
                  const defaultRefund = !isLate; // Default: refund if not late
                  const refundSession = user?.isAdmin ? adminRefundSession : defaultRefund;
                  unregisterMemberMutation.mutate({ 
                    registrationId: Number(confirmUnregisterId), 
                    refundSession: user?.isAdmin ? refundSession : undefined 
                  });
                }
                setConfirmUnregisterId(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Unregister
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unvalidate Confirmation Dialog */}
      <AlertDialog open={!!confirmUnvalidateId} onOpenChange={open => !open && setConfirmUnvalidateId(null)}>
        <AlertDialogTrigger asChild />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unvalidate Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unvalidate this check-in? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmUnvalidateId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUnvalidateId) unvalidateCheckinMutation.mutate(Number(confirmUnvalidateId));
                setConfirmUnvalidateId(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Unvalidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}