import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from 'lucide-react';
import { formatDate, formatTime, formatLongDate, getDayName, getShortDayName } from '@/lib/date';

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
    firstName: string;
    lastName: string;
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
  viewMode: "daily" | "weekly" | "monthly";
  onViewModeChange: (mode: "daily" | "weekly" | "monthly") => void;
}

export default function ScheduleCalendar({ 
  schedules, 
  registrations, 
  checkins, 
  viewMode, 
  onViewModeChange 
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

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

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "daily") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
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
                    onClick={() => setSelectedSchedule(schedule)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</h3>
                      <p className={`${isPast ? 'text-gray-400' : 'text-muted-foreground'}`}>
                        {schedule.trainer?.firstName || 'Unknown'} {schedule.trainer?.lastName || ''}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {registeredMembers.length}/{schedule.class?.maxCapacity || 0} registered
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {attendedMembers.length} attended
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={isPast ? "outline" : "secondary"}>
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
                         onClick={() => setSelectedSchedule(schedule)}>
                      <div className={`font-medium truncate ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</div>
                      <div className={isPast ? 'text-gray-400' : 'text-muted-foreground'}>{formatTime(schedule.startTime)}</div>
                      <div className="flex justify-between mt-1">
                        <span className={isPast ? 'text-gray-400' : ''}>{registeredMembers.length}/{schedule.class?.maxCapacity || 0}</span>
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
                             onClick={() => setSelectedSchedule(schedule)}>
                          <div className={`truncate font-medium ${isPast ? 'text-gray-500' : ''}`}>{schedule.class?.name || 'Unknown Class'}</div>
                          <div className="flex justify-between">
                            <span className={isPast ? 'text-gray-400' : ''}>{formatTime(schedule.startTime)}</span>
                            <span className={isPast ? 'text-gray-400' : ''}>{registeredMembers.length}/{schedule.class?.maxCapacity || 0}</span>
                          </div>
                          <div className={`text-xs ${isPast ? 'text-gray-400' : 'text-green-600'}`}>
                            {attendedMembers.length} attended
                          </div>
                        </div>
                      );
                    })}
                    {day.schedules.length > 2 && (
                      <div className="text-xs text-muted-foreground">
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
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
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
                    <div>Registered: {getScheduleRegistrations(selectedSchedule.id).length}</div>
                    <div>Attended: {getScheduleCheckins(selectedSchedule.id).length}</div>
                    <div>Attendance Rate: {
                      (() => {
                        const attended = getScheduleCheckins(selectedSchedule.id).length;
                        const registered = getScheduleRegistrations(selectedSchedule.id).length;
                        const maxCapacity = selectedSchedule.class?.maxCapacity || 0;
                        
                        const capacityRate = maxCapacity > 0 ? Math.round((attended / maxCapacity) * 100) : 0;
                        const registeredRate = registered > 0 ? Math.round((attended / registered) * 100) : 0;
                        
                        return `${capacityRate}% / ${registeredRate}%`;
                      })()
                    }</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Registered Members ({getScheduleRegistrations(selectedSchedule.id).length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getScheduleRegistrations(selectedSchedule.id).map((registration) => (
                      <div key={registration.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium">{registration.member?.firstName || 'Unknown'} {registration.member?.lastName || ''}</div>
                          <div className="text-xs text-muted-foreground">{registration.member?.email || 'No email'}</div>
                        </div>
                        <Badge variant={registration.status === 'registered' ? 'secondary' : 'default'}>
                          {registration.status}
                        </Badge>
                      </div>
                    ))}
                    {getScheduleRegistrations(selectedSchedule.id).length === 0 && (
                      <div className="text-muted-foreground text-sm">No members registered</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Attended Members ({getScheduleCheckins(selectedSchedule.id).length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getScheduleCheckins(selectedSchedule.id).map((checkin) => (
                      <div key={checkin.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                        <div>
                          <div className="font-medium">{checkin.member?.firstName || 'Unknown'} {checkin.member?.lastName || ''}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(checkin.checkinTime)}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Checked In
                        </Badge>
                      </div>
                    ))}
                    {getScheduleCheckins(selectedSchedule.id).length === 0 && (
                      <div className="text-muted-foreground text-sm">No check-ins yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}