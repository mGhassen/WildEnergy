import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Users, CheckCircle, MapPin } from "lucide-react";
import { formatTime, getDayName, formatDate } from "@/lib/auth";

interface CalendarViewProps {
  schedules: any[];
  registrations: any[];
  onBookClass: (schedule: any) => void;
  subscription: any;
}

export default function CalendarView({ schedules, registrations, onBookClass, subscription }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  const getSchedulesForDay = (dayOfWeek: number, date: Date) => {
    return schedules.filter(schedule => {
      if (schedule.dayOfWeek !== dayOfWeek) return false;
      const scheduleDate = new Date(schedule.scheduleDate);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const isClassInPast = (schedule: any, date: Date) => {
    const classDateTime = new Date(date);
    const [hours, minutes] = schedule.startTime.split(':');
    classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return classDateTime < new Date();
  };

  const isRegistered = (scheduleId: number) => {
    return registrations.some(reg => reg.schedule.id === scheduleId && reg.status === 'registered');
  };

  const getAvailableSpots = (schedule: any) => {
    const registeredCount = registrations.filter(reg => 
      reg.schedule.id === schedule.id && reg.status === 'registered'
    ).length;
    return schedule.class.maxCapacity - registeredCount;
  };

  const weekDates = getWeekDates(currentWeek);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Modern Calendar Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-foreground">
            {currentWeek.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="bg-background">
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="bg-background">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek} className="bg-background">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekly Schedule View */}
      <div className="space-y-4">
        {weekDates.map((date, dayIndex) => {
          const daySchedules = getSchedulesForDay(dayIndex === 6 ? 0 : dayIndex + 1, date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div key={dayIndex} className="space-y-3">
              {/* Day Header */}
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                isToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
              }`}>
                <div className={`flex items-center gap-3 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  <div className="text-lg font-semibold">
                    {dayNames[dayIndex]}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-sm font-medium ${
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {formatDateShort(date)}
                  </div>
                  {isToday && (
                    <Badge variant="secondary" className="text-xs">Today</Badge>
                  )}
                </div>
                <div className="flex-1"></div>
                <div className="text-sm text-muted-foreground">
                  {daySchedules.length} {daySchedules.length === 1 ? 'class' : 'classes'}
                </div>
              </div>

              {/* Classes for the day */}
              {daySchedules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                  {daySchedules.map((schedule) => {
                    const isPast = isClassInPast(schedule, date);
                    const userRegistered = isRegistered(schedule.id);
                    const availableSpots = getAvailableSpots(schedule);
                    const canBook = !isPast && !userRegistered && availableSpots > 0 && (subscription?.sessionsRemaining > 0);
                    
                    return (
                      <Card 
                        key={schedule.id} 
                        className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${
                          canBook ? 'cursor-pointer hover:scale-105' : ''
                        } ${userRegistered ? 'ring-2 ring-green-500/50 bg-green-50/50' : ''} ${
                          isPast ? 'opacity-60' : ''
                        }`}
                        onClick={() => canBook && onBookClass(schedule)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Class header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">
                                  {schedule.class.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  with {schedule.trainer.firstName} {schedule.trainer.lastName}
                                </p>
                              </div>
                              <Badge 
                                variant={userRegistered ? "default" : "secondary"}
                                className={userRegistered ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {schedule.class.category}
                              </Badge>
                            </div>

                            {/* Class details */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(schedule.startTime)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {availableSpots} spots left
                              </div>
                            </div>

                            {/* Status and action */}
                            <div className="flex items-center justify-between">
                              {userRegistered ? (
                                <div className="flex items-center text-green-600 text-sm font-medium">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  You're registered
                                </div>
                              ) : isPast ? (
                                <div className="text-sm text-muted-foreground">
                                  Class finished
                                </div>
                              ) : availableSpots === 0 ? (
                                <div className="text-sm text-red-500 font-medium">
                                  Class full
                                </div>
                              ) : !(subscription?.sessionsRemaining > 0) ? (
                                <div className="text-sm text-orange-500 font-medium">
                                  No sessions remaining
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  className="bg-primary hover:bg-primary/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBookClass(schedule);
                                  }}
                                >
                                  Book Class
                                </Button>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                {schedule.class.duration}min
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 pl-4">
                  <div className="text-muted-foreground">
                    No classes scheduled for this day
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}