"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, ArrowLeft, User, Calendar, Clock, Users, AlertTriangle, Filter } from "lucide-react";
import { apiFetch } from "@/lib/api";
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
      planName: string;
      status: string;
      sessionsRemaining: number;
    };
  };
  course: {
    id: string;
    course_date: string;
    start_time: string;
    end_time: string;
    class_id: number;
    trainer_id: number;
    class: {
      id: number;
      name: string;
      category?: string;
      difficulty?: string;
      maxCapacity?: number;
    };
    trainer: {
      id: number;
      users: {
        id: string;
        first_name: string;
        last_name: string;
      };
    };
  };
  registration: {
    id: string;
    status: string;
    registeredAt: string;
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
  const qrCode = params.id as string;
  
  const [status, setStatus] = useState<'loading' | 'info' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [checkinInfo, setCheckinInfo] = useState<CheckinInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUnvalidating, setIsUnvalidating] = useState(false);
  
  // Status filter state (excluding canceled members)
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['registered', 'attended', 'absent', 'checked_in']));
  const [showFilters, setShowFilters] = useState(false);

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
    setStatusFilters(new Set(['registered', 'attended', 'absent', 'checked_in']));
  };

  // Function to clear all statuses
  const clearAllStatuses = () => {
    setStatusFilters(new Set());
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
    fetchCheckinInfo(qrCode);
  }, [qrCode]);

  const fetchCheckinInfo = async (qrCodeValue: string) => {
    try {
      setStatus('loading');
      setMessage('Fetching check-in information...');

      // Call the QR code info endpoint
      const response = await apiFetch(`/checkin/qr/${qrCodeValue}`, {
        method: 'GET'
      });

      if (response.success) {
        console.log('Frontend Debug - API Response:', response.data);
        console.log('Frontend Debug - totalMembers:', response.data.totalMembers);
        console.log('Frontend Debug - members length:', response.data.members?.length);
        setStatus('info');
        setCheckinInfo(response.data);
        setMessage('Please validate the check-in information below');
      } else {
        setStatus('error');
        setMessage(response.message || 'Failed to fetch check-in information');
      }
    } catch (error: any) {
      console.error('Fetch check-in info error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to fetch check-in information. Please try again.');
    }
  };

  const validateCheckin = async () => {
    if (!checkinInfo) return;

    try {
      setIsValidating(true);
      setMessage('Processing check-in...');

      // Call the check-in API
      const response = await apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify({
          qr_code: qrCode
        })
      });

      if (response.success) {
        setStatus('success');
        setMessage('Check-in successful!');
        toast({
          title: "Check-in Successful",
          description: `Welcome ${checkinInfo.member?.first_name || ''} to your class!`,
        });
        // Refetch check-in info to update UI
        fetchCheckinInfo(qrCode);
      } else {
        setStatus('error');
        setMessage(response.message || 'Check-in failed');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      setStatus('error');
      setMessage(error.message || 'Check-in failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const unvalidateCheckin = async () => {
    if (!checkinInfo) return;
    try {
      setIsUnvalidating(true);
      setMessage('Unvalidating check-in...');
      const registrationId = checkinInfo.registration.id;
      const response = await apiFetch(`/checkins/${registrationId}/unvalidate`, {
        method: 'POST',
      });
      if (response.success) {
        setStatus('info');
        setMessage('Check-in unvalidated.');
        toast({
          title: "Check-in Unvalidated",
          description: `Check-in has been removed for this member.`,
        });
        // Refetch check-in info to update UI
        fetchCheckinInfo(qrCode);
      } else {
        setStatus('error');
        setMessage(response.message || 'Failed to unvalidate check-in');
      }
    } catch (error: any) {
      console.error('Unvalidate check-in error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to unvalidate check-in. Please try again.');
    } finally {
      setIsUnvalidating(false);
    }
  };

  const handleRetry = () => {
    setStatus('loading');
    fetchCheckinInfo(qrCode);
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

              {/* Member Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Member Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                  <p><strong>Name:</strong> {checkinInfo.member ? `${checkinInfo.member.first_name} ${checkinInfo.member.last_name}` : 'Unknown'}</p>
                  <p><strong>Email:</strong> {checkinInfo.member?.email || 'Unknown'}</p>
                  {checkinInfo.member?.phone && (
                    <p><strong>Phone:</strong> {checkinInfo.member.phone}</p>
                  )}
                  <p><strong>Status:</strong> {checkinInfo.member?.status || '-'}</p>
                  {checkinInfo.member?.activeSubscription && (
                    <p className="col-span-2"><strong>Active Subscription:</strong> <span className="font-semibold text-green-800">{checkinInfo.member.activeSubscription.planName}</span> <span className="ml-2 px-2 py-1 rounded bg-green-100 text-green-800 text-xs">{checkinInfo.member.activeSubscription.status}</span> <span className="ml-2 text-xs text-green-700">{checkinInfo.member.activeSubscription.sessionsRemaining} sessions left</span></p>
                  )}
                </div>
              </div>

              {/* Course Information */}
              <div className={`rounded-lg p-4 ${isLateCheckin() ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <h3 className={`font-medium mb-3 flex items-center ${isLateCheckin() ? 'text-orange-800' : 'text-green-800'}`}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Course Information
                  {isLateCheckin() && (
                    <span className="ml-2 px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-medium">
                      ⚠️ Late Check-in
                    </span>
                  )}
                </h3>
                <div className={`space-y-2 text-sm ${isLateCheckin() ? 'text-orange-700' : 'text-green-700'}`}>
                  <p><strong>Class:</strong> {checkinInfo.course?.class?.name || 'Unknown'}</p>
                  <p><strong>Trainer:</strong> {checkinInfo.course?.trainer?.users ? `${checkinInfo.course.trainer.users.first_name} ${checkinInfo.course.trainer.users.last_name}` : 'Unknown'}</p>
                  <p><strong>Date:</strong> {formatDateTime(checkinInfo.course?.course_date)}</p>
                  <p><strong>Time:</strong> {checkinInfo.course?.start_time && checkinInfo.course?.end_time ? `${checkinInfo.course.start_time} - ${checkinInfo.course.end_time}` : 'Unknown'}</p>
                  <p><strong>Category:</strong> {checkinInfo.course?.class?.category || '-'}</p>
                  <p><strong>Difficulty:</strong> {checkinInfo.course?.class?.difficulty || '-'}</p>
                  <p><strong>Max Capacity:</strong> {checkinInfo.course?.class?.maxCapacity || '-'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">Registered: {checkinInfo.registeredCount}</span>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">Checked In: {checkinInfo.checkedInCount}</span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">Max: {checkinInfo.course?.class?.maxCapacity || '-'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${checkinInfo.registration.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{checkinInfo.registration.status}</span>
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs">Registered At: {formatDateTime(checkinInfo.registration.registeredAt)}</span>
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
                        { key: 'checked_in', label: 'Checked In', color: 'bg-green-100 text-green-800' }
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
                          member.status === 'checked_in'
                            ? 'bg-green-100 text-green-800'
                            : member.status === 'attended'
                            ? 'bg-blue-100 text-blue-800'
                            : member.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status === 'checked_in' ? 'Checked In' : 
                           member.status === 'attended' ? 'Attended' :
                           member.status === 'absent' ? 'Absent' :
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
          <div className="flex gap-3">
            {status === 'info' && !checkinInfo?.alreadyCheckedIn && (
              <Button 
                onClick={validateCheckin} 
                disabled={isValidating}
                className="flex-1"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Validate Check-in
                  </>
                )}
              </Button>
            )}
            {status === 'info' && checkinInfo?.alreadyCheckedIn && (
              <Button 
                onClick={unvalidateCheckin} 
                disabled={isUnvalidating}
                variant="destructive"
                className="flex-1"
              >
                {isUnvalidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Unvalidate Check-in
                  </>
                )}
              </Button>
            )}
            {status === 'error' && (
              <Button onClick={handleRetry} className="flex-1">
                <Loader2 className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            <Button 
              onClick={handleBack} 
              variant={status === 'success' ? 'default' : 'outline'}
              className="flex-1"
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