"use client";

import { useState, useEffect } from "react";
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
    if (!qrCode) {
      setStatus('invalid');
      setMessage('Invalid QR code');
      return;
    }
    
    if (isLoading) {
      setStatus('loading');
      setMessage('Fetching check-in information...');
    } else if (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to fetch check-in information');
    } else if (checkinInfo) {
      setStatus('info');
      setMessage('Please validate the check-in information below');
      
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
          setStatus('success');
          setMessage('Check-in successful!');
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
    refetch();
  };

  const handleBack = () => {
    router.push('/admin/checkins');
  };

  if (!qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid QR Code</CardTitle>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
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
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === 'info' && (
              <User className="w-16 h-16 text-blue-500" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
            {status === 'invalid' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>

          {/* Message */}
          <div className="text-center">
            <p className="text-lg font-medium">{message}</p>
          </div>

          {/* Late Check-in Alert */}
          {status === 'info' && checkinInfo && isLateCheckin() && !checkinInfo.alreadyCheckedIn && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>⚠️ Late Check-in Alert!</strong><br/>
                This member is checking in <strong>{getLateCheckinMessage()}</strong> after the class start time ({checkinInfo.course.start_time}).<br/>
                <span className="text-sm">The registration status will be updated to 'attended' when validated.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Check-in Information */}
          {status === 'info' && checkinInfo && (
            <div className="space-y-6">
              {/* Already Checked In Celebration */}
              {checkinInfo.alreadyCheckedIn && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex flex-col items-center text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mb-2" />
                  <h4 className="text-xl font-bold text-green-800 mb-1">Checked In! 🎉</h4>
                  <p className="text-green-700 text-base">This member is already checked in.<br/>Youhouuu! Welcome to the class!</p>
                </div>
              )}

              {/* Member Information - Collapsible */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg">
                <button
                  onClick={() => toggleSection('member')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-blue-100 transition-colors"
                >
                  <h3 className="font-medium text-blue-800 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Member Information
                </h3>
                  {expandedSections.member ? (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  )}
                </button>
                
                {expandedSections.member && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
                      <div>
                  <p><strong>Name:</strong> {checkinInfo.member ? `${checkinInfo.member.first_name} ${checkinInfo.member.last_name}` : 'Unknown'}</p>
                  <p><strong>Email:</strong> {checkinInfo.member?.email || 'Unknown'}</p>
                  {checkinInfo.member?.phone && (
                    <p><strong>Phone:</strong> {checkinInfo.member.phone}</p>
                  )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong>Status:</strong>
                          <Badge variant={checkinInfo.member?.status === 'active' ? 'default' : 'secondary'}>
                            {checkinInfo.member?.status || '-'}
                          </Badge>
                        </div>
                        <p><strong>Member ID:</strong> {checkinInfo.member?.id || '-'}</p>
                      </div>
                    </div>
                
                    {/* Subscription Information */}
                  {checkinInfo.member?.activeSubscription && (
                      <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Active Subscription
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
                          <div>
                            <p><strong>Plan:</strong> {checkinInfo.member.activeSubscription.planName}</p>
                            <div className="flex items-center gap-2">
                              <strong>Status:</strong>
                              <Badge variant="default" className="bg-green-600">
                                {checkinInfo.member.activeSubscription.status}
                              </Badge>
                            </div>
                            <p><strong>Sessions Remaining:</strong> 
                              <span className="ml-2 font-bold text-lg text-green-800">
                                {checkinInfo.member.activeSubscription.sessionsRemaining}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p><strong>Total Sessions:</strong> {checkinInfo.member.activeSubscription.planSessionCount}</p>
                            <p><strong>Price:</strong> {checkinInfo.member.activeSubscription.planPrice ? `$${checkinInfo.member.activeSubscription.planPrice}` : 'N/A'}</p>
                            <p><strong>Valid Until:</strong> {checkinInfo.member.activeSubscription.endDate ? formatDateTime(checkinInfo.member.activeSubscription.endDate) : 'N/A'}</p>
                          </div>
                        </div>
                        {checkinInfo.member.activeSubscription.planDescription && (
                          <p className="mt-2 text-xs text-green-600">
                            <strong>Description:</strong> {checkinInfo.member.activeSubscription.planDescription}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {!checkinInfo.member?.activeSubscription && (
                      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          No Active Subscription
                        </h4>
                        <p className="text-yellow-700 text-sm">This member does not have an active subscription.</p>
                      </div>
                    )}

                    {/* Guest Registration Information */}
                    {checkinInfo.registration?.isGuestRegistration && (
                      <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Guest Registration
                        </h4>
                        <p className="text-purple-700 text-sm">
                          This member was registered as a <strong>guest</strong> by an admin. 
                          This check-in will be counted as a guest check-in and will not consume any subscription sessions.
                        </p>
                        {checkinInfo.registration.notes && (
                          <p className="text-purple-600 text-xs mt-1 italic">
                            Note: {checkinInfo.registration.notes}
                          </p>
                        )}
                      </div>
                    )}
                </div>
                )}
              </div>

              {/* Course Information - Collapsible */}
              <div className={`rounded-lg ${isLateCheckin() ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <button
                  onClick={() => toggleSection('course')}
                  className={`w-full p-4 text-left flex items-center justify-between hover:${isLateCheckin() ? 'bg-orange-100' : 'bg-green-100'} transition-colors`}
                >
                  <h3 className={`font-medium flex items-center ${isLateCheckin() ? 'text-orange-800' : 'text-green-800'}`}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Course Information
                  {isLateCheckin() && (
                      <Badge variant="destructive" className="ml-2">
                      ⚠️ Late Check-in
                      </Badge>
                    )}
                  </h3>
                  {expandedSections.course ? (
                    <ChevronDown className={`w-4 h-4 ${isLateCheckin() ? 'text-orange-600' : 'text-green-600'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${isLateCheckin() ? 'text-orange-600' : 'text-green-600'}`} />
                  )}
                </button>
                
                {expandedSections.course && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className={`${isLateCheckin() ? 'text-orange-700' : 'text-green-700'}`}>
                  <p><strong>Course ID:</strong> {checkinInfo.course?.id ? `CRS-${String(checkinInfo.course.id).padStart(5, '0')}` : 'Unknown'}</p>
                  <p><strong>Class:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                  <p><strong>Date:</strong> {formatDateTime(checkinInfo.course?.course_date)}</p>
                  <p><strong>Time:</strong> {checkinInfo.course?.start_time && checkinInfo.course?.end_time ? `${checkinInfo.course.start_time} - ${checkinInfo.course.end_time}` : 'Unknown'}</p>
                  <p><strong>Category:</strong> {checkinInfo.course?.class?.category || '-'}</p>
                      </div>
                      <div className={`${isLateCheckin() ? 'text-orange-700' : 'text-green-700'}`}>
                        <div className="flex items-center gap-2">
                          <strong>Difficulty:</strong>
                          <Badge variant="outline">
                            {checkinInfo.course?.class?.difficulty || '-'}
                          </Badge>
                        </div>
                        <p><strong>Capacity:</strong> {checkinInfo.checkedInCount || 0} / {checkinInfo.course?.class?.maxCapacity || '-'}</p>
                        <p><strong>Registered:</strong> {checkinInfo.registeredCount || 0}</p>
                        <p><strong>Total Members:</strong> {checkinInfo.totalMembers || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trainer Information - Collapsible */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg">
                <button
                  onClick={() => toggleSection('trainer')}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-purple-100 transition-colors"
                >
                  <h3 className="font-medium text-purple-800 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Trainer Information
                  </h3>
                  {expandedSections.trainer ? (
                    <ChevronDown className="w-4 h-4 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-purple-600" />
                  )}
                </button>
                
                {expandedSections.trainer && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-700">
                      <div>
                        <p><strong>Name:</strong> {checkinInfo.course?.trainer ? `${checkinInfo.course.trainer.first_name} ${checkinInfo.course.trainer.last_name}` : 'Unknown'}</p>
                        {checkinInfo.course?.trainer?.phone && (
                          <p><strong>Phone:</strong> {checkinInfo.course.trainer.phone}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <strong>Status:</strong>
                          <Badge variant={checkinInfo.course?.trainer?.status === 'active' ? 'default' : 'secondary'}>
                            {checkinInfo.course?.trainer?.status || '-'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {checkinInfo.course?.trainer?.specialization && (
                          <p><strong>Specialization:</strong> {checkinInfo.course.trainer.specialization}</p>
                        )}
                        {checkinInfo.course?.trainer?.experience_years && (
                          <p><strong>Experience:</strong> {checkinInfo.course.trainer.experience_years} years</p>
                        )}
                        {checkinInfo.course?.trainer?.certification && (
                          <p><strong>Certification:</strong> {checkinInfo.course.trainer.certification}</p>
                        )}
                        {checkinInfo.course?.trainer?.hourly_rate && (
                          <p><strong>Rate:</strong> ${checkinInfo.course.trainer.hourly_rate}/hour</p>
                        )}
                      </div>
                    </div>
                    {checkinInfo.course?.trainer?.bio && (
                      <div className="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-600">
                        <strong>Bio:</strong> {checkinInfo.course.trainer.bio}
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Admin Decision Panel */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Admin Decision Panel
                </h3>
                
                {/* Quick Status Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-600 mb-1">Sessions Left</p>
                    <p className="text-2xl font-bold text-green-600">
                      {checkinInfo.member?.activeSubscription?.sessionsRemaining || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-600 mb-1">Class Capacity</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {checkinInfo.checkedInCount || 0}/{checkinInfo.course?.class?.maxCapacity || '-'}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-600 mb-1">Registration</p>
                    <Badge variant={checkinInfo.registration?.status === 'registered' ? 'default' : 'secondary'} className="text-sm">
                      {checkinInfo.registration?.status || '-'}
                    </Badge>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-gray-600 mb-1">Check-in Status</p>
                    <Badge variant={checkinInfo.alreadyCheckedIn ? 'default' : 'outline'} className="text-sm">
                      {checkinInfo.alreadyCheckedIn ? 'Already In' : 'Not Checked In'}
                    </Badge>
                  </div>
                </div>

                {/* Decision Factors */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-medium">Valid Subscription:</span>
                    <Badge variant={checkinInfo.member?.activeSubscription ? 'default' : 'destructive'}>
                      {checkinInfo.member?.activeSubscription ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-medium">Sessions Available:</span>
                    <Badge variant={(checkinInfo.member?.activeSubscription?.sessionsRemaining || 0) > 0 ? 'default' : 'destructive'}>
                      {(checkinInfo.member?.activeSubscription?.sessionsRemaining || 0) > 0 ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-medium">Class Not Full:</span>
                    <Badge variant={(checkinInfo.checkedInCount || 0) < (checkinInfo.course?.class?.maxCapacity || 0) ? 'default' : 'destructive'}>
                      {(checkinInfo.checkedInCount || 0) < (checkinInfo.course?.class?.maxCapacity || 0) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="font-medium">Member Status:</span>
                    <Badge variant={checkinInfo.member?.status === 'active' ? 'default' : 'secondary'}>
                      {checkinInfo.member?.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Unified Members List */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
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
                  <div className="mb-4 p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
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
                        { key: 'registered', label: 'Registered', color: 'bg-gray-100 text-gray-800' },
                        { key: 'attended', label: 'Attended', color: 'bg-blue-100 text-blue-800' },
                        { key: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
                        { key: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-600' }
                      ].map(({ key, label, color }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${key}`}
                            checked={statusFilters.has(key)}
                            onCheckedChange={() => toggleStatusFilter(key)}
                          />
                          <label
                            htmlFor={`filter-${key}`}
                            className="text-sm flex items-center gap-2 cursor-pointer"
                          >
                            <span className={`px-2 py-1 rounded text-xs ${color}`}>
                              {label}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {getFilteredMembers().length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredMembers().map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <span className="font-medium">{member.first_name} {member.last_name}</span>
                          <span className="text-xs text-gray-500 ml-2">({member.email})</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          member.status === 'attended'
                            ? 'bg-blue-100 text-blue-800'
                            : member.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : member.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status === 'attended' ? 'Attended' :
                           member.status === 'absent' ? 'Absent' :
                           member.status === 'cancelled' ? 'Cancelled' :
                           member.status === 'registered' ? 'Registered' :
                           member.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Check-in Successful!</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Member:</strong> {checkinInfo.member ? `${checkinInfo.member.first_name} ${checkinInfo.member.last_name}` : 'Unknown'}</p>
                <p><strong>Course:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                <p><strong>Class:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
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
                  className={`w-full h-12 text-lg font-semibold ${checkinInfo?.registration?.isGuestRegistration ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  size="lg"
              >
                {checkInMutation.isPending ? (
                  <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Check-in...
                  </>
                ) : (
                  <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {checkinInfo?.registration?.isGuestRegistration ? '🎉 Approve Guest Check-in' : '✅ Approve Check-in'}
                  </>
                )}
              </Button>
                
                {/* Guest check-in message */}
                {checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-purple-700 bg-purple-50 p-2 rounded border">
                    🎉 Guest Check-in: This check-in will not consume any subscription sessions
                  </div>
                )}
                
                {/* Warning messages for regular registrations */}
                {!checkinInfo?.member?.activeSubscription && !checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded border">
                    ⚠️ Cannot check in: No active subscription
                  </div>
                )}
                {(checkinInfo?.member?.activeSubscription?.sessionsRemaining || 0) <= 0 && checkinInfo?.member?.activeSubscription && !checkinInfo?.registration?.isGuestRegistration && (
                  <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded border">
                    ⚠️ Cannot check in: No sessions remaining
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
                      Processing Check-out...
                  </>
                ) : (
                  <>
                      <XCircle className="w-5 h-5 mr-2" />
                      ❌ Check Out Member
                  </>
                )}
              </Button>
                <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded border">
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
                🔄 Retry
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