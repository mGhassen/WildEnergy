import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Search, Clock, Users, Calendar, Star, AlertTriangle, CheckCircle, CalendarDays, List } from "lucide-react";
import { formatTime, getDayName } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import CalendarView from "@/components/calendar-view";
import { formatDate } from "@/lib/date";

export default function MemberClassesEnhanced() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [showPastClasses, setShowPastClasses] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const { data: subscription = {} } = useQuery({
    queryKey: ["/api/member/subscription"],
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const registerMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return await apiRequest("POST", "/api/registrations", { scheduleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscription"] });
      setShowBookingDialog(false);
      toast({
        title: "Class booked successfully!",
        description: "Your QR code has been generated. Check 'Class History' to view it.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to book class";
      toast({
        title: "Booking failed",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (registrationId: number) => {
      return await apiRequest("POST", `/api/registrations/${registrationId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscription"] });
      setShowCancelDialog(false);
      toast({
        title: "Registration cancelled",
        description: "Your session has been refunded to your account.",
      });
    },
    onError: (error) => {
      toast({
        title: "Cannot cancel registration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredSchedules = (schedules || []).filter((schedule: any) => {
    if (!schedule?.class || !schedule?.trainer) return false;
    const matchesSearch = schedule.class.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.trainer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.trainer.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === "all" || schedule.class.category === categoryFilter;
    const matchesDay = !dayFilter || dayFilter === "all" || schedule.dayOfWeek.toString() === dayFilter;
    
    // Check if class is in the past
    const classDate = new Date(schedule.scheduleDate);
    const today = new Date();
    const isPastClass = classDate < today;
    
    const matchesTimeFilter = showPastClasses || !isPastClass;
    
    return matchesSearch && matchesCategory && matchesDay && matchesTimeFilter;
  });

  const isRegistered = (scheduleId: number) => {
    return (registrations || []).some((reg: any) => reg?.schedule?.id === scheduleId && reg?.status === 'registered');
  };

  const getRegistration = (scheduleId: number) => {
    return (registrations || []).find((reg: any) => reg?.schedule?.id === scheduleId && reg?.status === 'registered');
  };

  const getRegisteredCount = (scheduleId: number) => {
    return (registrations || []).filter((reg: any) => 
      reg?.schedule?.id === scheduleId && reg?.status === 'registered'
    ).length;
  };

  const getAvailableSpots = (schedule: any) => {
    const registeredCount = getRegisteredCount(schedule?.id);
    return Math.max(0, (schedule?.class?.maxCapacity || 0) - registeredCount);
  };

  const canCancelRegistration = (registration: any) => {
    if (!registration?.schedule?.scheduleDate || !registration?.schedule?.startTime) return false;
    
    // Create the full class date and time
    const classDate = new Date(registration.schedule.scheduleDate);
    const [hours, minutes] = registration.schedule.startTime.split(':');
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    
    // Can cancel anytime before class starts, but within 24h loses session
    return now < classDate;
  };

  const isWithin24Hours = (registration: any) => {
    if (!registration?.schedule?.scheduleDate || !registration?.schedule?.startTime) return false;
    
    const classDate = new Date(registration.schedule.scheduleDate);
    const [hours, minutes] = registration.schedule.startTime.split(':');
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const cutoffTime = new Date(classDate.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    
    return now >= cutoffTime && now < classDate;
  };

  const isClassInPast = (schedule: any) => {
    const classDate = new Date(schedule.scheduleDate);
    const now = new Date();
    return classDate < now;
  };

  const handleBookClass = (schedule: any) => {
    setSelectedClass(schedule);
    setShowBookingDialog(true);
  };

  const handleCancelClass = (registration: any) => {
    const within24h = isWithin24Hours(registration);
    const message = within24h 
      ? "Cancelling within 24 hours will forfeit your session. Continue?"
      : "Are you sure you want to cancel this class registration?";
    
    setSelectedRegistration({...registration, within24h, message});
    setShowCancelDialog(true);
  };

  const confirmBooking = () => {
    if (selectedClass) {
      registerMutation.mutate(selectedClass.id);
    }
  };

  const confirmCancellation = () => {
    if (selectedRegistration) {
      cancelMutation.mutate(selectedRegistration.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    );
  }

  const uniqueCategories = [...new Set((schedules || []).map((s: any) => s?.class?.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Browse Classes</h1>
          <p className="text-muted-foreground mt-2">
            Book your favorite classes and manage your schedule
          </p>
        </div>
        {subscription && (
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Sessions Remaining</div>
            <div className="text-2xl font-bold text-primary">{subscription?.sessionsRemaining || 0}</div>
            <div className="text-xs text-muted-foreground">{subscription?.plan?.name || "No Plan"}</div>
          </Card>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Calendar View
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4 mr-2" />
            List View
          </Button>
        </div>
      </div>

      {/* Filters - only show for list view */}
      {viewMode === "list" && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search classes or trainers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All days</SelectItem>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {getDayName(day)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPast"
              checked={showPastClasses}
              onChange={(e) => setShowPastClasses(e.target.checked)}
              className="rounded border border-gray-300"
            />
            <label htmlFor="showPast" className="text-sm text-muted-foreground">
              Show past classes
            </label>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === "calendar" ? (
        <CalendarView 
          schedules={schedules || []}
          registrations={registrations || []}
          onBookClass={(schedule) => handleBookClass(schedule)}
          subscription={subscription}
        />
      ) : (
        <>
          {/* Class Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchedules.map((schedule: any) => {
          const isUserRegistered = isRegistered(schedule.id);
          const userRegistration = getRegistration(schedule.id);
          const availableSpots = getAvailableSpots(schedule);
          const canCancel = canCancelRegistration(userRegistration);

          return (
            <Card key={schedule.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-foreground">{schedule.class.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {schedule.trainer.firstName} {schedule.trainer.lastName}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{schedule.class.category}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex flex-col h-full">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    {getDayName(schedule.dayOfWeek)}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTime(schedule.startTime)}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    {availableSpots} spots left
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Star className="w-4 h-4 mr-2" />
                    {schedule.class.duration}min
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Next class: {formatDate(schedule.scheduleDate)}
                </div>

                <div className="mt-auto">
                {isUserRegistered ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      You're registered for this class
                    </div>
                    {canCancel ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClass(userRegistration)}
                        className="w-full"
                      >
                        Cancel Registration
                      </Button>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Cannot cancel within 24 hours of class start
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={() => !isClassInPast(schedule) && handleBookClass(schedule)}
                    disabled={availableSpots === 0 || !(subscription?.sessionsRemaining > 0) || isClassInPast(schedule)}
                    className={`w-full ${isClassInPast(schedule) ? "bg-gray-400 cursor-not-allowed text-gray-600" : ""}`}
                  >
                    {isClassInPast(schedule) ? "Class Ended" :
                     availableSpots === 0 ? "Class Full" : 
                     !(subscription?.sessionsRemaining > 0) ? "No Sessions Left" :
                     "Book Class"}
                  </Button>
                )}
                </div>
              </CardContent>
            </Card>
              );
            })}
          </div>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No classes found matching your criteria.</p>
            </div>
          )}
        </>
      )}

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Class Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to book this class?
            </DialogDescription>
          </DialogHeader>
          
          {selectedClass && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedClass.class.name}</h3>
                <p className="text-muted-foreground">
                  {selectedClass.trainer.firstName} {selectedClass.trainer.lastName}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {getDayName(selectedClass.dayOfWeek)} at {formatTime(selectedClass.startTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedClass.scheduleDate)}
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cancellation Policy</AlertTitle>
                <AlertDescription>
                  You can cancel your registration up to 24 hours before the class starts. 
                  Cancellations within 24 hours will consume your session.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmBooking}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Registration</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your registration for this class?
            </DialogDescription>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedRegistration.schedule.class.name}</h3>
                <p className="text-muted-foreground">
                  {selectedRegistration.schedule.trainer.firstName} {selectedRegistration.schedule.trainer.lastName}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {getDayName(selectedRegistration.schedule.dayOfWeek)} at {formatTime(selectedRegistration.schedule.startTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedRegistration.schedule.scheduleDate)}
                </p>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Session Refund</AlertTitle>
                <AlertDescription>
                  Since you're cancelling more than 24 hours in advance, 
                  your session will be refunded to your account.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Registration
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmCancellation}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : 
               selectedRegistration?.within24h ? "Cancel & Forfeit Session" : "Cancel Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}