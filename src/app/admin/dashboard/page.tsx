"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, TrendingUp, Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { formatDateTime, formatTime, formatDate } from "@/lib/date";
import { useState } from "react";
import { useAdminDashboardStats } from "@/hooks/useAdmin";
import { useCheckins } from "@/hooks/useCheckins";
import { useSchedules } from "@/hooks/useSchedules";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useAdminDashboardTasks } from "@/hooks/useAdminDashboardTasks";
import { Sidebar } from "@/components/ui/sidebar";
import { DashboardSkeleton } from "@/components/skeletons";

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
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: tasks, isLoading: tasksLoading } = useAdminDashboardTasks();
  const { data: recentCheckins = [] } = useCheckins();

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

  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules();
  const { data: registrations = [] } = useRegistrations();

  const getScheduleRegistrations = (scheduleId: string) => {
    return registrations.filter((reg: any) => 
      reg.course?.schedule_id === scheduleId && reg.status !== "cancelled"
    );
  };

  if (statsLoading || schedulesLoading || tasksLoading) {
    return <DashboardSkeleton />;
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

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Accounts Pending Approval */}
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Accounts to Approve</CardTitle>
                    <CardDescription>Pending account approvals</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700">
                  {tasks?.pendingAccounts.count || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {(tasks?.pendingAccounts?.count ?? 0) > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {tasks?.pendingAccounts?.count ?? 0} account{(tasks?.pendingAccounts?.count ?? 0) !== 1 ? 's' : ''} waiting for approval
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(tasks?.pendingAccounts?.accounts ?? []).slice(0, 3).map((account: any) => (
                      <div key={account.account_id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                              {account.first_name?.[0]}{account.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{account.first_name} {account.last_name}</p>
                            <p className="text-xs text-muted-foreground">{account.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatDate(account.created_at)}
                        </Badge>
                      </div>
                    ))}
                    {(tasks?.pendingAccounts?.count ?? 0) > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{(tasks?.pendingAccounts?.count ?? 0) - 3} more accounts
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                    onClick={() => window.location.href = '/admin/accounts'}
                  >
                    View All Accounts
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courses to Start Checking */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Courses Starting Soon</CardTitle>
                    <CardDescription>Courses ready for check-in</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">
                  {tasks?.coursesNeedingCheck.count || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {(tasks?.coursesNeedingCheck?.count ?? 0) > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {tasks?.coursesNeedingCheck?.count ?? 0} course{(tasks?.coursesNeedingCheck?.count ?? 0) !== 1 ? 's' : ''} starting soon
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(tasks?.coursesNeedingCheck?.courses ?? []).slice(0, 3).map((course: any) => (
                      <div key={course.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {course.class.category.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{course.class.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.trainer.member.first_name} {course.trainer.member.last_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{formatTime(course.start_time)}</p>
                          <Badge variant="outline" className="text-xs">
                            {course.current_participants}/{course.max_participants}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {(tasks?.coursesNeedingCheck?.count ?? 0) > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{(tasks?.coursesNeedingCheck?.count ?? 0) - 3} more courses
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
                    onClick={() => window.location.href = '/admin/courses'}
                  >
                    View All Courses
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No courses starting soon</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                    reg.course?.schedule_id === scheduleId && reg.status !== "cancelled"
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
