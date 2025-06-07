import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, MapPin } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";

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
  schedule: Schedule;
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
  registration: Registration;
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
    return registrations.filter(reg => reg.schedule?.id === scheduleId);
  };

  const getScheduleCheckins = (scheduleId: number) => {
    return checkins.filter(checkin => checkin.registration?.schedule?.id === scheduleId);
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
      return currentDate.toLocaleDateString();
    } else if (viewMode === "weekly") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const getVisibleSchedules = () => {
    if (viewMode === "daily") {
      const dateStr = currentDate.toISOString().split('T')[0];
      return schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.scheduleDate).toISOString().split('T')[0];
        return scheduleDate === dateStr;
      });
    } else if (viewMode === "weekly") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.scheduleDate);
        return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek;
      });
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      return schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.scheduleDate);
        return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === month;
      });
    }
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
            
            return (
              <Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedSchedule(schedule)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{schedule.class.name}</h3>
                      <p className="text-muted-foreground">
                        {schedule.trainer.firstName} {schedule.trainer.lastName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {registeredMembers.length}/{schedule.class.maxCapacity}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant="secondary">
                        {schedule.class.category}
                      </Badge>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Attended:</div>
                        <div className="font-semibold">{attendedMembers.length}/{registeredMembers.length}</div>
                      </div>
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
            const scheduleDate = new Date(schedule.scheduleDate).toISOString().split('T')[0];
            return scheduleDate === dayStr;
          });
          
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNumber = day.getDate();
          
          return (
            <Card key={dayIndex} className="min-h-48">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {dayName} {dayNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {daySchedules.map((schedule) => {
                  const registeredMembers = getScheduleRegistrations(schedule.id);
                  const attendedMembers = getScheduleCheckins(schedule.id);
                  
                  return (
                    <div key={schedule.id} 
                         className="p-2 bg-primary/10 rounded text-xs cursor-pointer hover:bg-primary/20"
                         onClick={() => setSelectedSchedule(schedule)}>
                      <div className="font-medium truncate">{schedule.class.name}</div>
                      <div className="text-muted-foreground">{formatTime(schedule.startTime)}</div>
                      <div className="flex justify-between mt-1">
                        <span>{registeredMembers.length}/{schedule.class.maxCapacity}</span>
                        <span className="text-green-600">{attendedMembers.length}</span>
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
        const dateStr = date.toISOString().split('T')[0];
        
        // Filter schedules by actual scheduleDate instead of dayOfWeek
        const daySchedules = schedules.filter(schedule => {
          const scheduleDate = new Date(schedule.scheduleDate).toISOString().split('T')[0];
          return scheduleDate === dateStr;
        });
        
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
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-muted-foreground">
              {day}
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
                      
                      return (
                        <div key={schedule.id} 
                             className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                             onClick={() => setSelectedSchedule(schedule)}>
                          <div className="truncate font-medium">{schedule.class.name}</div>
                          <div className="flex justify-between">
                            <span>{formatTime(schedule.startTime)}</span>
                            <span>{attendedMembers.length}/{registeredMembers.length}</span>
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
              <DialogTitle>{selectedSchedule.class.name}</DialogTitle>
              <DialogDescription>
                {new Date(selectedSchedule.scheduleDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Class Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>Trainer: {selectedSchedule.trainer.firstName} {selectedSchedule.trainer.lastName}</div>
                    <div>Category: {selectedSchedule.class.category}</div>
                    <div>Duration: {selectedSchedule.class.duration} minutes</div>
                    <div>Capacity: {selectedSchedule.class.maxCapacity} members</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Attendance Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div>Registered: {getScheduleRegistrations(selectedSchedule.id).length}</div>
                    <div>Attended: {getScheduleCheckins(selectedSchedule.id).length}</div>
                    <div>Attendance Rate: {
                      getScheduleRegistrations(selectedSchedule.id).length > 0 
                        ? Math.round((getScheduleCheckins(selectedSchedule.id).length / getScheduleRegistrations(selectedSchedule.id).length) * 100)
                        : 0
                    }%</div>
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
                          <div className="font-medium">{registration.member.firstName} {registration.member.lastName}</div>
                          <div className="text-xs text-muted-foreground">{registration.member.email}</div>
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
                          <div className="font-medium">{checkin.member.firstName} {checkin.member.lastName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(checkin.checkinTime).toLocaleTimeString()}
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