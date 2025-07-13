"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, TrendingUp, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, formatTime, formatDate } from "@/lib/auth";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/ui/sidebar";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalClasses: number;
  totalTrainers: number;
}

interface Checkin {
  id: string;
  member: {
    firstName: string;
    lastName: string;
  };
  checkinTime: string;
  schedule: {
    class: {
      name: string;
    };
  };
}

interface Schedule {
  id: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  class: {
    name: string;
  };
  trainer: {
    firstName: string;
    lastName: string;
  };
  maxParticipants: number;
}

interface Registration {
  id: string;
  scheduleId: string;
  status: string;
  schedule: {
    id: string;
  };
}

export default function AdminDashboard() {
  const [scheduleViewDate, setScheduleViewDate] = useState(0); // 0 = today, 1 = tomorrow
  
  // Always provide queryFn for useQuery
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/dashboard/stats"),
  });

  const { data: recentCheckins = [] } = useQuery({
    queryKey: ["/api/checkins"],
    queryFn: () => apiRequest("GET", "/api/checkins"),
  });

  // Map checkins to ensure member data has camelCase fields
  const mappedCheckins = Array.isArray(recentCheckins)
    ? recentCheckins.map((checkin: any) => ({
        ...checkin,
        member: checkin.member ? {
          ...checkin.member,
          firstName: checkin.member.firstName || checkin.member.first_name || '',
          lastName: checkin.member.lastName || checkin.member.last_name || '',
        } : null,
      }))
    : [];

  // Get the 5 most recent checkins
  const recentCheckinsList = mappedCheckins
    .sort((a: any, b: any) => new Date(b.checkinTime).getTime() - new Date(a.checkinTime).getTime())
    .slice(0, 5);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
    queryFn: () => apiRequest("GET", "/api/schedules"),
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
  });

  const getScheduleRegistrations = (scheduleId: string) => {
    return registrations.filter(reg => 
      reg.schedule?.id === scheduleId && reg.status !== "cancelled"
    );
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  interface StatCard {
    title: string;
    value: number;
    icon: any;
    description: string;
    color: string;
    bgColor: string;
  }

  const statCards: StatCard[] = [
    {
      title: "Total Members",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Registered members",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Members",
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      description: "Active members",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Trainers",
      value: stats?.totalTrainers || 0,
      icon: UserCheck,
      description: "Available trainers",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Total Classes",
      value: stats?.totalClasses || 0,
      icon: Calendar,
      description: "Available classes",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your gym management system</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-muted-foreground">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Latest member check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCheckinsList && recentCheckinsList.length > 0 ? (
                <div className="space-y-4">
                  {recentCheckinsList.map((checkin: any) => (
                    <div key={checkin.id} className="flex items-center space-x-4 p-3 hover:bg-accent rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {checkin.member?.firstName?.[0]}{checkin.member?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {checkin.member?.firstName} {checkin.member?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {checkin.class?.name} • {formatDateTime(checkin.checkinTime)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent check-ins</p>
              )}
            </CardContent>
          </Card>
          {/* Schedule Slider */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {scheduleViewDate === 0 ? "Today's Schedule" : "Tomorrow's Schedule"}
                  </CardTitle>
                  <CardDescription>
                    {scheduleViewDate === 0 
                      ? formatDate(new Date().toISOString())
                      : formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScheduleViewDate(scheduleViewDate === 0 ? 1 : 0)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* TODO: Render today's or tomorrow's schedule here */}
              {schedulesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (() => {
                const targetDate = new Date();
                if (scheduleViewDate === 1) {
                  targetDate.setDate(targetDate.getDate() + 1);
                }
                const targetDateStr = targetDate.toISOString().split('T')[0];
                
                const daySchedules = schedules?.filter((schedule: any) => {
                  const scheduleDate = schedule.scheduleDate?.split('T')[0];
                  return scheduleDate === targetDateStr;
                }) || [];

                const getScheduleRegistrations = (scheduleId: number) => {
                  return registrations?.filter((reg: any) => 
                    reg.schedule?.id === scheduleId && reg.status !== "cancelled"
                  ) || [];
                };

                return daySchedules.length > 0 ? (
                  <div className="space-y-4">
                    {daySchedules.map((schedule: any) => {
                      const scheduleRegs = getScheduleRegistrations(schedule.id);
                      const spotsAvailable = (schedule.class?.maxCapacity || 0) - scheduleRegs.length;
                      
                      return (
                        <div key={schedule.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {schedule.class?.category?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold">{schedule.class?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {schedule.trainer?.firstName} {schedule.trainer?.lastName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </span>
                              </div>
                              <Badge variant={spotsAvailable > 0 ? "default" : "destructive"}>
                                {spotsAvailable} / {schedule.class?.maxCapacity || 0} spots available
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Registered: </span>
                              <span className="font-medium">{scheduleRegs.length} members</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="font-medium">{schedule.class?.duration || 0} min</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Category: </span>
                              <span className="font-medium">{schedule.class?.category}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                {schedule.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>

                          {scheduleRegs.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium mb-2">Registered Members:</p>
                              <div className="flex flex-wrap gap-2">
                                {scheduleRegs.slice(0, 6).map((reg: any) => (
                                  <Badge key={reg.id} variant="outline" className="text-xs">
                                    {reg.member?.firstName} {reg.member?.lastName}
                                  </Badge>
                                ))}
                                {scheduleRegs.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{scheduleRegs.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No classes scheduled for {scheduleViewDate === 0 ? "today" : "tomorrow"}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
