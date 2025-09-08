"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, ArrowLeft, User, Calendar, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCheckinInfo, useValidateCheckin, useUnvalidateCheckin } from "@/hooks/useCheckins";
import { CardSkeleton, FormSkeleton } from "@/components/skeletons";

interface CheckinInfo {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  course: {
    id: string;
    name: string;
    description?: string;
    class: {
      id: string;
      name: string;
      trainer: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
    date?: string;
    startTime?: string;
    endTime?: string;
  };
  registration: {
    id: string;
    status: string;
    registeredAt: string;
  };
  registeredCount: number;
  checkedInCount: number;
  alreadyCheckedIn: boolean;
  registeredMembers?: { id: string; firstName: string; lastName: string; email: string }[];
  attendantMembers?: { id: string; firstName: string; lastName: string; email: string }[];
}

export default function CheckinPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'info' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [checkinInfo, setCheckinInfo] = useState<CheckinInfo | null>(null);
  const [qrCode, setQrCode] = useState<string>('');

  const { data: checkinData, isLoading, error } = useCheckinInfo(qrCode);
  const validateCheckinMutation = useValidateCheckin();
  const unvalidateCheckinMutation = useUnvalidateCheckin();

  useEffect(() => {
    // Extract QR code from URL path
    const path = window.location.pathname;
    let qrCodeFromPath = path.replace('/checkin/', '');
    if (qrCodeFromPath.startsWith('qr/')) {
      qrCodeFromPath = qrCodeFromPath.replace('qr/', '');
    }
    if (!qrCodeFromPath || qrCodeFromPath === 'checkin') {
      setStatus('invalid');
      setMessage('Invalid QR code');
      return;
    }
    setQrCode(qrCodeFromPath);
  }, []);

  useEffect(() => {
    if (checkinData) {
      setStatus('info');
      setCheckinInfo(checkinData);
      setMessage('Please validate the check-in information below');
    } else if (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to fetch check-in information');
    } else if (isLoading) {
      setStatus('loading');
      setMessage('Fetching check-in information...');
    }
  }, [checkinData, error, isLoading]);

  const validateCheckin = async () => {
    if (!checkinInfo) return;

    validateCheckinMutation.mutate(qrCode, {
      onSuccess: () => {
        setStatus('success');
        setMessage('Check-in successful!');
        toast({
          title: "Check-in Successful",
          description: `Welcome ${checkinInfo.member?.firstName || ''} to your class!`,
        });
        // Refetch check-in info to update UI
        // The data will be refreshed automatically by React Query
      },
      onError: (error: any) => {
        setStatus('error');
        setMessage(error.message || 'Check-in failed');
      }
    });
  };

  const unvalidateCheckin = async () => {
    if (!checkinInfo) return;

    unvalidateCheckinMutation.mutate(checkinInfo.registration.id, {
      onSuccess: () => {
        setStatus('info');
        setMessage('Check-in unvalidated.');
        toast({
          title: "Check-in Unvalidated",
          description: `Check-in has been removed for this member.`,
        });
        // Refetch check-in info to update UI
        // The data will be refreshed automatically by React Query
      },
      onError: (error: any) => {
        setStatus('error');
        setMessage(error.message || 'Failed to unvalidate check-in');
      }
    });
  };

  const handleRetry = () => {
    setStatus('loading');
    // The data will be refreshed automatically by React Query
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

          {/* Loading Skeleton */}
          {status === 'loading' && (
            <div className="space-y-6">
              <CardSkeleton showImage={false} lines={4} />
              <CardSkeleton showImage={false} lines={3} />
            </div>
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
                  <p><strong>Name:</strong> {checkinInfo.member ? `${checkinInfo.member.firstName} ${checkinInfo.member.lastName}` : 'Unknown'}</p>
                  <p><strong>Email:</strong> {checkinInfo.member?.email || 'Unknown'}</p>
                  {checkinInfo.member?.phone && (
                    <p><strong>Phone:</strong> {checkinInfo.member.phone}</p>
                  )}
                </div>
              </div>

              {/* Course Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Course Information
                </h3>
                <div className="space-y-2 text-sm text-green-700">
                  <p><strong>Course:</strong> {checkinInfo.course?.name || checkinInfo.course?.class?.name || 'Unknown'}</p>
                  {checkinInfo.course?.description && (
                    <p><strong>Description:</strong> {checkinInfo.course.description}</p>
                  )}
                  <p><strong>Class:</strong> {checkinInfo.course?.class?.name || checkinInfo.course?.class?.name || 'Unknown'}</p>
                  <p><strong>Trainer:</strong> {checkinInfo.course?.class?.trainer ? `${checkinInfo.course.class?.trainer.firstName} ${checkinInfo.course.class.trainer.lastName}` : 'Unknown'}</p>
                  <p><strong>Date:</strong> {checkinInfo.course?.date ? new Date(checkinInfo.course.date).toLocaleDateString() : 'Unknown'}</p>
                  <p><strong>Time:</strong> {checkinInfo.course?.startTime && checkinInfo.course?.endTime ? `${checkinInfo.course.startTime} - ${checkinInfo.course.endTime}` : 'Unknown'}</p>
                </div>
              </div>

              {/* Registration Information */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-800 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Registration Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-700">
                  <p><strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      checkinInfo.registration.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {checkinInfo.registration.status}
                    </span>
                  </p>
                  <p><strong>Registered:</strong> {checkinInfo.course?.date ? new Date(checkinInfo.course.date).toLocaleDateString() : 'Unknown'}</p>
                  <p><strong>Registered Members:</strong> {checkinInfo.registeredCount}</p>
                  <p><strong>Checked In:</strong> {checkinInfo.checkedInCount}</p>
                </div>
              </div>

              {/* Registered Members List */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Registered Members
                </h3>
                <ul className="text-sm text-gray-700 list-disc pl-5">
                  {checkinInfo.registeredMembers && checkinInfo.registeredMembers.length > 0 ? (
                    checkinInfo.registeredMembers.map((m: any) => (
                      <li key={m.id}>{m.firstName} {m.lastName} ({m.email})</li>
                    ))
                  ) : (
                    <li>No registered members</li>
                  )}
                </ul>
              </div>

              {/* Attendant Members List */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Attendant Members (Checked In)
                </h3>
                <ul className="text-sm text-green-700 list-disc pl-5">
                  {checkinInfo.attendantMembers && checkinInfo.attendantMembers.length > 0 ? (
                    checkinInfo.attendantMembers.map((m: any) => (
                      <li key={m.id}>{m.firstName} {m.lastName} ({m.email})</li>
                    ))
                  ) : (
                    <li>No attendants yet</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Success Details */}
          {status === 'success' && checkinInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Check-in Successful!</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Member:</strong> {checkinInfo.member ? `${checkinInfo.member.firstName} ${checkinInfo.member.lastName}` : 'Unknown'}</p>
                <p><strong>Course:</strong> {checkinInfo.course?.name || checkinInfo.course?.class?.name || 'Unknown'}</p>
                <p><strong>Class:</strong> {checkinInfo.course?.class?.name || checkinInfo.course?.class?.name || 'Unknown'}</p>
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
                disabled={validateCheckinMutation.isPending}
                className="flex-1"
              >
                {validateCheckinMutation.isPending ? (
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
                disabled={unvalidateCheckinMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                {unvalidateCheckinMutation.isPending ? (
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