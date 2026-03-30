"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, ArrowLeft, User, Calendar, Clock, Users, AlertTriangle, Filter, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useCheckinInfo, useCheckInRegistration, useCheckOutRegistration } from "@/hooks/useCheckins";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface CheckinInfo {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status?: string;
    activeSubscription?: {
      id: string;
      planName: string;
      planDescription?: string;
      planPrice?: number;
      planSessionCount: number;
      status: string;
      sessionsRemaining: number;
      startDate: string;
      endDate: string;
      groupSessions: any[];
    };
  };
  course: {
    id: string;
    course_date: string;
    start_time: string;
    end_time: string;
    class_id: number;
    trainer_id: string;
    class: {
      id: number;
      name: string;
      category?: string;
      difficulty?: string;
      maxCapacity?: number;
    };
    trainer: {
      id: number;
      first_name: string;
      last_name: string;
      phone?: string;
      specialization?: string;
      experience_years?: number;
      bio?: string;
      certification?: string;
      hourly_rate?: number;
      status?: string;
    };
  };
  registration: {
    id: string;
    status: string;
    registeredAt: string;
    isGuestRegistration?: boolean;
    notes?: string;
  };
  registeredCount: number;
  checkedInCount: number;
  totalMembers: number;
  alreadyCheckedIn: boolean;
  registeredMembers?: { id: string; first_name: string; last_name: string; email: string; status?: string }[];
  attendantMembers?: { id: string; first_name: string; last_name: string; email: string }[];
  members?: { id: string; first_name: string; last_name: string; email: string; status?: 'registered' | 'attended' | 'absent' | 'checked_in' }[]; // Excludes cancelled members
}

export default function CheckinQRPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // Get QR code from params immediately to avoid hydration mismatch
  let qrCode = params.id as string;
  
  // URL decode the QR code in case it was encoded
  try {
    qrCode = decodeURIComponent(qrCode);
  } catch (e) {
    console.log('QR Page - URL decode failed, using original:', e);
  }
  
  console.log('QR Page - Received QR code from params:', qrCode);
  console.log('QR Page - QR code type:', typeof qrCode);
  console.log('QR Page - QR code length:', qrCode?.length);
  
  const [status, setStatus] = useState<'loading' | 'info' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  /** After check-in, query refetch must not reset UI back to the pre-approval state. */
  const checkInSucceededRef = useRef(false);
  
  // Use hooks for data fetching and mutations
  const { data: checkinInfo, isLoading, error, refetch } = useCheckinInfo(qrCode);
  const checkInMutation = useCheckInRegistration();
  const checkOutMutation = useCheckOutRegistration();
  
  // Status filter state (excluding canceled members)
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['registered', 'attended', 'absent', 'cancelled']));
  const [showFilters, setShowFilters] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    member: true,    // Member info opened by default
    course: false,
    trainer: false
  });

  // Function to check if this is a late check-in
  const isLateCheckin = (): boolean => {
    if (!checkinInfo?.course) return false;
    
    const now = new Date();
    const courseDate = new Date(checkinInfo.course.course_date);
    const [startHours, startMinutes] = checkinInfo.course.start_time.split(':').map(Number);
    
    // Set the course start time
    const courseStartTime = new Date(courseDate);
    courseStartTime.setHours(startHours, startMinutes, 0, 0);
    
    // Check if current time is after course start time
    return now > courseStartTime;
  };

  // Function to get late check-in message
  const getLateCheckinMessage = (): string => {
    if (!checkinInfo?.course) return '';
    
    const now = new Date();
    const courseDate = new Date(checkinInfo.course.course_date);
    const [startHours, startMinutes] = checkinInfo.course.start_time.split(':').map(Number);
    
    const courseStartTime = new Date(courseDate);
    courseStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const diffMs = now.getTime() - courseStartTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} late`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''} late`;
    }
  };

  // Function to handle status filter toggle
  const toggleStatusFilter = (status: string) => {
    const newFilters = new Set(statusFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setStatusFilters(newFilters);
  };

  // Function to select all statuses
  const selectAllStatuses = () => {
    setStatusFilters(new Set(['registered', 'attended', 'absent', 'cancelled']));
  };

  // Function to clear all statuses
  const clearAllStatuses = () => {
    setStatusFilters(new Set());
  };

  // Function to toggle collapsible sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Function to get filtered members
  const getFilteredMembers = () => {
    if (!checkinInfo?.members) return [];
    return checkinInfo.members.filter(member => statusFilters.has(member.status || ''));
  };

  useEffect(() => {
    checkInSucceededRef.current = false;
  }, [qrCode]);

  useEffect(() => {
    if (!qrCode) {
      setStatus('invalid');
      setMessage('Invalid QR code');
      return;
    }
    
    if (isLoading) {
      if (!checkInSucceededRef.current) {
        setStatus('loading');
        setMessage('Fetching check-in information...');
      }
      return;
    }
    if (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to fetch check-in information');
    } else if (checkinInfo) {
      if (checkInSucceededRef.current) {
        setStatus('success');
        setMessage('');
        return;
      }
      setStatus('info');
      setMessage('');

      // Debug subscription data
      console.log('QR Page - Check-in info received:', checkinInfo);
      console.log('QR Page - Member data:', checkinInfo.member);
      console.log('QR Page - Active subscription:', checkinInfo.member?.activeSubscription);
      console.log('QR Page - Subscription details:', {
        hasSubscription: !!checkinInfo.member?.activeSubscription,
        planName: checkinInfo.member?.activeSubscription?.planName,
        status: checkinInfo.member?.activeSubscription?.status,
        sessionsRemaining: checkinInfo.member?.activeSubscription?.sessionsRemaining
      });
    }
  }, [qrCode, isLoading, error, checkinInfo]);


  const checkIn = async () => {
    if (!checkinInfo) return;

    setMessage('Processing check-in...');
    checkInMutation.mutate(
      checkinInfo.registration.id,
      {
        onSuccess: () => {
          checkInSucceededRef.current = true;
          setStatus('success');
          setMessage('');
        },
        onError: (error: any) => {
          setStatus('error');
          setMessage(error.message || 'Check-in failed. Please try again.');
        }
      }
    );
  };

  const checkOut = async () => {
    if (!checkinInfo) return;

    setMessage('Processing check-out...');
    const registrationId = checkinInfo.registration.id;
    checkOutMutation.mutate(registrationId, {
      onSuccess: () => {
        setStatus('info');
        setMessage('Member checked out.');
      },
      onError: (error: any) => {
        setStatus('error');
        setMessage(error.message || 'Failed to check out member. Please try again.');
      }
    });
  };

  const handleRetry = () => {
    checkInSucceededRef.current = false;
    refetch();
  };

  const handleBack = () => {
    router.push('/admin/checkins');
  };

  if (!qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Invalid QR Code</CardTitle>
            <CardDescription className="text-center">
              The QR code is invalid or missing.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-ins
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Loading Check-in Information...'}
            {status === 'info' && 'Check-in Information'}
            {status === 'success' && 'Check-in Successful!'}
            {status === 'error' && 'Check-in Failed'}
            {status === 'invalid' && 'Invalid QR Code'}
          </CardTitle>
          <CardDescription className="text-center">
            QR Code: {qrCode}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(status === 'loading' || status === 'error' || status === 'invalid') && (
            <div className="flex justify-center">
              {status === 'loading' && (
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              )}
              {status === 'error' && (
                <XCircle className="w-16 h-16 text-destructive" />
              )}
              {status === 'invalid' && (
                <XCircle className="w-16 h-16 text-destructive" />
              )}
            </div>
          )}

          {status === 'loading' && message && (
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">{message}</p>
            </div>
          )}

          {(status === 'error' || status === 'invalid') && message && (
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">{message}</p>
            </div>
          )}

          {status === 'info' && checkinInfo && !checkinInfo.alreadyCheckedIn && (
            <>
              <div className="flex justify-center">
                {checkInMutation.isPending || checkOutMutation.isPending ? (
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                ) : (
                  <User className="w-16 h-16 text-primary" />
                )}
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  {checkInMutation.isPending
                    ? message || 'Processing check-in…'
                    : checkOutMutation.isPending
                      ? message || 'Processing check-out…'
                      : 'Please validate the check-in information below'}
                </p>
              </div>
            </>
          )}

          {/* Late Check-in Alert */}
          {status === 'info' && checkinInfo && isLateCheckin() && !checkinInfo.alreadyCheckedIn && (
            <Alert className="border-chart-4/40 bg-chart-4/10">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              <AlertDescription className="text-muted-foreground">
                <strong className="text-foreground">Late check-in</strong>
                <br />
                This member is checking in <strong className="text-foreground">{getLateCheckinMessage()}</strong> after the class start time (
                {checkinInfo.course.start_time}).
                <br />
                <span className="text-sm">The registration status will be updated to &apos;attended&apos; when validated.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Check-in Information */}
          {status === 'info' && checkinInfo && (
            <div className="space-y-6">
              {/* Already Checked In Celebration */}
              {checkinInfo.alreadyCheckedIn && (
                <div className="rounded-lg border border-primary/30 bg-primary/15 p-4 flex flex-col items-center text-center">
                  <CheckCircle className="w-12 h-12 text-primary mb-2" />
                  <h4 className="text-xl font-bold text-foreground mb-1">Checked in</h4>
                  <p className="text-muted-foreground text-base">
                    This member is already checked in.
                  </p>
                </div>
              )}

              {/* Member Information - Collapsible */}
              <div className="rounded-lg border border-chart-2/35 bg-chart-2/10">
                <button
                  type="button"
                  onClick={() => toggleSection('member')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-chart-2/20 transition-colors rounded-t-lg"
                >
                  <h3 className="font-medium text-foreground flex items-center">
                  <User className="w-4 h-4 mr-2 text-chart-2" />
                  Member Information
                </h3>
                  {expandedSections.member ? (
                    <ChevronDown className="w-4 h-4 text-chart-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-chart-2" />
                  )}
                </button>
                
                {expandedSections.member && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div>
                  <p><strong className="text-foreground">Name:</strong> {checkinInfo.member ? `${checkinInfo.member.first_name} ${checkinInfo.member.last_name}` : 'Unknown'}</p>
                  <p><strong className="text-foreground">Email:</strong> {checkinInfo.member?.email || 'Unknown'}</p>
                  {checkinInfo.member?.phone && (
                    <p><strong className="text-foreground">Phone:</strong> {checkinInfo.member.phone}</p>
                  )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-foreground">Status:</strong>
                          <Badge variant={checkinInfo.member?.status === 'active' ? 'default' : 'secondary'}>
                            {checkinInfo.member?.status || '-'}
                          </Badge>
                        </div>
                        <p><strong className="text-foreground">Member ID:</strong> {checkinInfo.member?.id || '-'}</p>
                      </div>
                    </div>
                
                    {/* Subscription Information */}
                  {checkinInfo.member?.activeSubscription && (
                      <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/10">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-primary" />
                          Active subscription
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>
                            <p><strong className="text-foreground">Plan:</strong> {checkinInfo.member.activeSubscription.planName}</p>
                            <div className="flex items-center gap-2">
                              <strong className="text-foreground">Status:</strong>
                              <Badge variant="default">
                                {checkinInfo.member.activeSubscription.status}
                              </Badge>
                            </div>
                            <p>
                              <strong className="text-foreground">Sessions remaining:</strong>
                              <span className="ml-2 font-bold text-lg text-foreground">
                                {checkinInfo.member.activeSubscription.sessionsRemaining}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p><strong className="text-foreground">Total sessions:</strong> {checkinInfo.member.activeSubscription.planSessionCount}</p>
                            <p><strong className="text-foreground">Price:</strong> {checkinInfo.member.activeSubscription.planPrice ? `$${checkinInfo.member.activeSubscription.planPrice}` : 'N/A'}</p>
                            <p><strong className="text-foreground">Valid until:</strong> {checkinInfo.member.activeSubscription.endDate ? formatDateTime(checkinInfo.member.activeSubscription.endDate) : 'N/A'}</p>
                          </div>
                        </div>
                        {checkinInfo.member.activeSubscription.planDescription && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            <strong className="text-foreground">Description:</strong> {checkinInfo.member.activeSubscription.planDescription}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {!checkinInfo.member?.activeSubscription && (
                      <div className="mt-4 p-3 rounded-lg border border-chart-4/35 bg-chart-4/10">
                        <h4 className="font-semibold text-foreground mb-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1 text-chart-4" />
                          No active subscription
                        </h4>
                        <p className="text-muted-foreground text-sm">This member does not have an active subscription.</p>
                      </div>
                    )}

                    {/* Guest Registration Information */}
                    {checkinInfo.registration?.isGuestRegistration && (
                      <div className="mt-4 p-3 rounded-lg border border-dashed border-chart-3/40 bg-chart-3/10">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center">
                          <Users className="w-4 h-4 mr-1 text-chart-3" />
                          Guest registration
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          This member was registered as a <strong className="text-foreground">guest</strong> by an admin.
                          This check-in will not consume subscription sessions.
                        </p>
                        {checkinInfo.registration.notes && (
                          <p className="text-muted-foreground text-xs mt-1 italic">
                            Note: {checkinInfo.registration.notes}
                          </p>
                        )}
                      </div>
                    )}
                </div>
                )}
              </div>

              {/* Course Information - Collapsible */}
              <div
                className={`rounded-lg border ${
                  isLateCheckin()
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-primary/35 bg-primary/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection('course')}
                  className={`w-full p-4 text-left flex items-center justify-between transition-colors rounded-t-lg ${
                    isLateCheckin() ? "hover:bg-destructive/15" : "hover:bg-primary/18"
                  }`}
                >
                  <h3 className="font-medium flex items-center text-foreground">
                  <Calendar className={`w-4 h-4 mr-2 ${isLateCheckin() ? "text-destructive" : "text-primary"}`} />
                  Course information
                  {isLateCheckin() && (
                      <Badge variant="destructive" className="ml-2">
                      Late check-in
                      </Badge>
                    )}
                  </h3>
                  {expandedSections.course ? (
                    <ChevronDown className={`w-4 h-4 ${isLateCheckin() ? "text-destructive" : "text-primary"}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${isLateCheckin() ? "text-destructive" : "text-primary"}`} />
                  )}
                </button>
                
                {expandedSections.course && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="text-muted-foreground">
                  <p><strong className="text-foreground">Course ID:</strong> {checkinInfo.course?.id ? `CRS-${String(checkinInfo.course.id).padStart(5, '0')}` : 'Unknown'}</p>
                  <p><strong className="text-foreground">Class:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                  <p><strong className="text-foreground">Date:</strong> {formatDateTime(checkinInfo.course?.course_date)}</p>
                  <p><strong className="text-foreground">Time:</strong> {checkinInfo.course?.start_time && checkinInfo.course?.end_time ? `${checkinInfo.course.start_time} - ${checkinInfo.course.end_time}` : 'Unknown'}</p>
                  <p><strong className="text-foreground">Category:</strong> {checkinInfo.course?.class?.category || '-'}</p>
                      </div>
                      <div className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <strong className="text-foreground">Difficulty</strong>
                          <Badge variant="outline">
                            {checkinInfo.course?.class?.difficulty || '-'}
                          </Badge>
                        </div>
                        <p><strong className="text-foreground">Capacity:</strong> {checkinInfo.checkedInCount || 0} / {checkinInfo.course?.class?.maxCapacity || '-'}</p>
                        <p><strong className="text-foreground">Registered:</strong> {checkinInfo.registeredCount || 0}</p>
                        <p><strong className="text-foreground">Total members:</strong> {checkinInfo.totalMembers || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trainer Information - Collapsible */}
              <div className="rounded-lg border border-chart-3/35 bg-chart-3/10">
                <button
                  type="button"
                  onClick={() => toggleSection('trainer')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-chart-3/20 transition-colors rounded-t-lg"
                >
                  <h3 className="font-medium text-foreground flex items-center">
                    <Users className="w-4 h-4 mr-2 text-chart-3" />
                    Trainer information
                  </h3>
                  {expandedSections.trainer ? (
                    <ChevronDown className="w-4 h-4 text-chart-3" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-chart-3" />
                  )}
                </button>
                
                {expandedSections.trainer && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div>
                        <p><strong className="text-foreground">Name:</strong> {checkinInfo.course?.trainer ? `${checkinInfo.course.trainer.first_name} ${checkinInfo.course.trainer.last_name}` : 'Unknown'}</p>
                        {checkinInfo.course?.trainer?.phone && (
                          <p><strong className="text-foreground">Phone:</strong> {checkinInfo.course.trainer.phone}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <strong className="text-foreground">Status:</strong>
                          <Badge variant={checkinInfo.course?.trainer?.status === 'active' ? 'default' : 'secondary'}>
                            {checkinInfo.course?.trainer?.status || '-'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {checkinInfo.course?.trainer?.specialization && (
                          <p><strong className="text-foreground">Specialization:</strong> {checkinInfo.course.trainer.specialization}</p>
                        )}
                        {checkinInfo.course?.trainer?.experience_years && (
                          <p><strong className="text-foreground">Experience:</strong> {checkinInfo.course.trainer.experience_years} years</p>
                        )}
                        {checkinInfo.course?.trainer?.certification && (
                          <p><strong className="text-foreground">Certification:</strong> {checkinInfo.course.trainer.certification}</p>
                        )}
                        {checkinInfo.course?.trainer?.hourly_rate && (
                          <p><strong className="text-foreground">Rate:</strong> ${checkinInfo.course.trainer.hourly_rate}/hour</p>
                        )}
                      </div>
                    </div>
                    {checkinInfo.course?.trainer?.bio && (
                      <div className="mt-3 p-2 rounded-md border border-chart-3/25 bg-chart-3/5 text-xs text-muted-foreground">
                        <strong className="text-foreground">Bio:</strong> {checkinInfo.course.trainer.bio}
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Admin Decision Panel */}
              <div className="rounded-lg border border-chart-4/35 bg-chart-4/10 p-4">
                <h3 className="font-bold text-foreground mb-4 flex items-center text-lg">
                  <CheckCircle className="w-5 h-5 mr-2 text-chart-4" />
                  Admin decision
                </h3>
                
                {/* Quick Status Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg border border-chart-4/25 bg-card/80 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-1">Sessions left</p>
                    <p className="text-2xl font-bold text-foreground">
                      {checkinInfo.member?.activeSubscription?.sessionsRemaining ?? 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg border border-chart-4/25 bg-card/80 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-1">Class capacity</p>
                    <p className="text-2xl font-bold text-foreground">
                      {checkinInfo.checkedInCount || 0}/{checkinInfo.course?.class?.maxCapacity || '-'}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg border border-chart-4/25 bg-card/80 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-1">Registration</p>
                    <Badge variant={checkinInfo.registration?.status === 'registered' ? 'default' : 'secondary'} className="text-sm">
                      {checkinInfo.registration?.status || '-'}
                    </Badge>
                  </div>
                  <div className="text-center p-3 rounded-lg border border-chart-4/25 bg-card/80 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-1">Check-in status</p>
                    <Badge variant={checkinInfo.alreadyCheckedIn ? 'default' : 'outline'} className="text-sm">
                      {checkinInfo.alreadyCheckedIn ? 'Checked in' : 'Not checked in'}
                    </Badge>
                  </div>
                </div>

                {/* Decision Factors */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded-md border border-chart-4/20 bg-card/90">
                    <span className="font-medium text-foreground">Valid subscription</span>
                    <Badge variant={checkinInfo.member?.activeSubscription ? 'default' : 'destructive'}>
                      {checkinInfo.member?.activeSubscription ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-md border border-chart-4/20 bg-card/90">
                    <span className="font-medium text-foreground">Sessions available</span>
                    <Badge variant={(checkinInfo.member?.activeSubscription?.sessionsRemaining || 0) > 0 ? 'default' : 'destructive'}>
                      {(checkinInfo.member?.activeSubscription?.sessionsRemaining || 0) > 0 ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-md border border-chart-4/20 bg-card/90">
                    <span className="font-medium text-foreground">Class not full</span>
                    <Badge variant={(checkinInfo.checkedInCount || 0) < (checkinInfo.course?.class?.maxCapacity || 0) ? 'default' : 'destructive'}>
                      {(checkinInfo.checkedInCount || 0) < (checkinInfo.course?.class?.maxCapacity || 0) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-md border border-chart-4/20 bg-card/90">
                    <span className="font-medium text-foreground">Member status</span>
                    <Badge variant={checkinInfo.member?.status === 'active' ? 'default' : 'secondary'}>
                      {checkinInfo.member?.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Unified Members List */}
              <div className="rounded-lg border border-chart-5/35 bg-chart-5/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground flex items-center">
                    <Users className="w-4 h-4 mr-2 text-chart-5" />
                    Course Members
                    <Badge variant="secondary" className="ml-2">
                      {(() => {
                        const filteredCount = getFilteredMembers().length;
                        const totalCount = checkinInfo?.totalMembers || 0;
                        console.log('Frontend Debug - Badge values:', { filteredCount, totalCount, totalMembers: checkinInfo?.totalMembers });
                        return `${filteredCount} of ${totalCount}`;
                      })()}
                    </Badge>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                </div>

                {/* Status Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-3 rounded-lg border border-chart-5/25 bg-card/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Filter by status</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllStatuses}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllStatuses}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'registered', label: 'Registered' },
                        { key: 'attended', label: 'Attended' },
                        { key: 'absent', label: 'Absent' },
                        { key: 'cancelled', label: 'Cancelled' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${key}`}
                            checked={statusFilters.has(key)}
                            onCheckedChange={() => toggleStatusFilter(key)}
                          />
                          <label
                            htmlFor={`filter-${key}`}
                            className="text-sm flex items-center gap-2 cursor-pointer text-foreground"
                          >
                            <Badge variant="secondary" className="text-xs font-normal">
                              {label}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {getFilteredMembers().length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredMembers().map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-md border border-chart-5/20 bg-card/90">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground">{member.first_name} {member.last_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({member.email})</span>
                        </div>
                        <Badge
                          variant={
                            member.status === 'absent' || member.status === 'cancelled'
                              ? 'destructive'
                              : member.status === 'attended'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-xs shrink-0"
                        >
                          {member.status === 'attended' ? 'Attended' :
                           member.status === 'absent' ? 'Absent' :
                           member.status === 'cancelled' ? 'Cancelled' :
                           member.status === 'registered' ? 'Registered' :
                           member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {checkinInfo?.members && checkinInfo.members.length > 0 
                      ? 'No members match the selected filters' 
                      : 'No registered members'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success Details */}
          {status === 'success' && checkinInfo && (
            <div className="rounded-lg border border-primary/35 bg-primary/15 p-4">
              <h3 className="font-medium text-foreground mb-2">Check-in successful</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Member:</strong> {checkinInfo.member ? `${checkinInfo.member.first_name} ${checkinInfo.member.last_name}` : 'Unknown'}</p>
                <p><strong className="text-foreground">Course:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                <p><strong className="text-foreground">Class:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                <p><strong className="text-foreground">Time:</strong> {new Date().toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Error Details */}
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'info' && !checkinInfo?.alreadyCheckedIn && (
              <div className="space-y-2">
              <Button 
                onClick={checkIn} 
                  disabled={checkInMutation.isPending || (!checkinInfo?.member?.activeSubscription && !checkinInfo?.registration?.isGuestRegistration) || ((checkinInfo.member?.activeSubscription?.sessionsRemaining || 0) <= 0 && !checkinInfo?.registration?.isGuestRegistration)}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
              >
                {checkInMutation.isPending ? (
                  <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing check-in…
                  </>
                ) : (
                  <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {checkinInfo?.registration?.isGuestRegistration ? 'Approve guest check-in' : 'Approve check-in'}
                  </>
                )}
              </Button>
                
                {checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-muted-foreground bg-chart-3/10 border border-chart-3/30 p-2 rounded-md">
                    Guest check-in: no subscription sessions will be used.
                  </div>
                )}
                
                {!checkinInfo?.member?.activeSubscription && !checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-md">
                    Cannot check in: no active subscription.
                  </div>
                )}
                {(checkinInfo?.member?.activeSubscription?.sessionsRemaining || 0) <= 0 && checkinInfo?.member?.activeSubscription && !checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-md">
                    Cannot check in: no sessions remaining.
                  </div>
                )}
              </div>
            )}
            
            {status === 'info' && checkinInfo?.alreadyCheckedIn && (
              <div className="space-y-2">
              <Button 
                onClick={checkOut} 
                disabled={checkOutMutation.isPending}
                variant="destructive"
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
              >
                {checkOutMutation.isPending ? (
                  <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing check-out…
                  </>
                ) : (
                  <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Check out member
                  </>
                )}
              </Button>
                <div className="text-center text-sm text-muted-foreground bg-primary/10 border border-primary/25 p-2 rounded-md">
                  Member is already checked in. Use this button to check them out.
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <Button 
                onClick={handleRetry} 
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                Retry
              </Button>
            )}
            
            <Button 
              onClick={handleBack} 
              variant="outline"
              className="w-full h-10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-ins
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 