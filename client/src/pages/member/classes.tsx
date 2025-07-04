import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Search, Clock, Users, Calendar, Star } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function MemberClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const { data: subscription } = useQuery({
    queryKey: ["/api/member/subscription"],
  });

  const { data: registrations } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const registerMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("POST", "/api/registrations", { scheduleId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      toast({
        title: "Class booked successfully!",
        description: "Your QR code has been generated. Check 'My Classes' to view it.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to book class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registeredScheduleIds = new Set(registrations?.map((reg: any) => reg.schedule?.id) || []);

  const filteredSchedules = schedules?.filter((schedule: any) => {
    const matchesSearch = `${schedule.class?.name} ${schedule.trainer?.firstName} ${schedule.trainer?.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || schedule.class?.category === categoryFilter;
    const matchesDay = !dayFilter || dayFilter === "all" || schedule.dayOfWeek.toString() === dayFilter;
    
    return matchesSearch && matchesCategory && matchesDay && schedule.isActive;
  }) || [];

  const handleRegister = (scheduleId: number) => {
    if (!subscription || subscription.sessionsRemaining <= 0) {
      toast({
        title: "No sessions remaining",
        description: "Please renew your subscription to book classes.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(scheduleId);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      yoga: "bg-green-100 text-green-800",
      hiit: "bg-red-100 text-red-800",
      strength: "bg-blue-100 text-blue-800",
      cardio: "bg-orange-100 text-orange-800",
      pilates: "bg-purple-100 text-purple-800",
      boxing: "bg-gray-100 text-gray-800",
    };
    return colors[category?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getIntensityLevel = (category: string) => {
    const levels: Record<string, { level: string; color: string }> = {
      yoga: { level: "Low", color: "text-green-600" },
      hiit: { level: "High", color: "text-red-600" },
      strength: { level: "Medium", color: "text-blue-600" },
      cardio: { level: "Medium", color: "text-orange-600" },
      pilates: { level: "Low", color: "text-purple-600" },
      boxing: { level: "High", color: "text-red-600" },
    };
    return levels[category?.toLowerCase()] || { level: "Medium", color: "text-gray-600" };
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Browse Classes</h1>
        <p className="text-muted-foreground">Find and book fitness classes that fit your schedule</p>
      </div>

      {/* Current Plan Summary */}
      {subscription && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">{subscription.plan?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Unlimited access to all classes
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{subscription.sessionsRemaining}</p>
                <p className="text-sm text-muted-foreground">sessions left</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="yoga">Yoga</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
                <SelectItem value="strength">Strength Training</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="pilates">Pilates</SelectItem>
                <SelectItem value="boxing">Boxing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filteredSchedules.length} classes available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredSchedules.length > 0 ? (
          filteredSchedules.map((schedule: any) => {
            const isRegistered = registeredScheduleIds.has(schedule.id);
            const intensity = getIntensityLevel(schedule.class?.category);
            
            return (
              <Card key={schedule.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{schedule.class?.name}</CardTitle>
                    <Badge className={getCategoryColor(schedule.class?.category)}>
                      {schedule.class?.category}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {schedule.class?.description || "Join this exciting fitness class and challenge yourself!"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className={`font-medium ${intensity.color}`}>
                          {intensity.level} Intensity
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>{schedule.class?.duration} min</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{getDayName(schedule.dayOfWeek)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>with {schedule.trainer?.firstName} {schedule.trainer?.lastName}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Max {schedule.class?.maxCapacity} participants</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleRegister(schedule.id)}
                      disabled={isRegistered || registerMutation.isPending || !subscription || subscription.sessionsRemaining <= 0}
                      variant={isRegistered ? "secondary" : "default"}
                    >
                      {isRegistered ? "Already Registered" : 
                       !subscription || subscription.sessionsRemaining <= 0 ? "No Sessions Left" :
                       registerMutation.isPending ? "Booking..." : "Book Class"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No classes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to see more classes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
