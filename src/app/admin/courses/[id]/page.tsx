"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  useCourse, 
  useDeleteCourse, 
  useAddMembersToCourse 
} from '@/hooks/useCourse';
import { useCheckInRegistration } from '@/hooks/useRegistrations';
import { useMembers, useCheckMemberSessions } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  User, 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Edit,
  Trash2,
  ArrowLeft,
  Phone,
  Mail,
  Award,
  Star,
  Target,
  Timer,
  BarChart3,
  UserCheck,
  UserX,
  Plus,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  UserMinus,
  CheckSquare,
  Square,
  QrCode,
  Check,
  Eye,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { formatTime, formatDate, formatDateRange, formatDateTime } from '@/lib/date';
import {
  memberCoversCourseOnDate,
  pickSubscriptionForCourse,
  usableSubscriptionsForCourse,
} from '@/lib/subscription-for-course';
import {
  assertCourseDeletableWithAutoCancel,
  describeCourseDeleteBlockReason,
} from '@/lib/course-delete-cleanup';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CourseDetails {
  id: number;
  schedule_id: number;
  class_id: number;
  trainer_id: string;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_active: boolean;
  code?: string;
  created_at: string;
  updated_at: string;
  isEdited?: boolean;
  differences?: {
    trainer?: {
      original: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        specialization: string;
        experience_years: number;
        bio?: string;
        certification?: string;
        status: string;
      } | null;
      current: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        specialization: string;
        experience_years: number;
        bio?: string;
        certification?: string;
        status: string;
      } | null;
    };
    startTime?: {
      original: string;
      current: string;
    };
    endTime?: {
      original: string;
      current: string;
    };
    maxParticipants?: {
      original: number;
      current: number;
    };
  };
  class: {
    id: number;
    name: string;
    description?: string;
    duration: number;
    max_capacity: number;
    equipment?: string;
    difficulty: string | string[];
    is_active: boolean;
    category: {
      id: number;
      name: string;
      color: string;
      group?: {
        id: number;
        name: string;
        color: string;
      } | null;
    };
  };
  trainer: {
    id: number;
    account_id: string;
    specialization: string;
    experience_years: number;
    bio?: string;
    certification?: string;
    status: string;
    member: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };
  };
  schedule: {
    id: number;
    day_of_week: number;
    repetition_type: string;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
  };
  registrations: Array<{
    id: number;
    registration_date: string;
    status: string;
    notes?: string;
    qr_code: string;
    subscription_id?: number | null;
    member: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };
  }>;
  checkins: Array<{
    id: number;
    checkin_time: string;
    registration_id?: number;
    member: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
  statistics: {
    totalRegistrations: number;
    totalCheckins: number;
    attendanceRate: number;
    availableSpots: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-primary/10 text-primary border-primary/20';
    case 'in_progress': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scheduled': return <Calendar className="w-4 h-4" />;
    case 'in_progress': return <Activity className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner': return 'bg-green-500/10 text-green-600';
    case 'intermediate': return 'bg-yellow-500/10 text-yellow-600';
    case 'advanced': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getTrainerName = (trainerData: any, courseData: any) => {
  // If trainerData is a number (old format), use courseData.trainer
  if (typeof trainerData === 'number') {
    const trainer = courseData?.trainer;
    if (!trainer) return 'Unknown Trainer';
    return `${trainer.member?.first_name || 'Unknown'} ${trainer.member?.last_name || 'Trainer'}`;
  }
  
  // If trainerData is an object (new format), use it directly
  if (trainerData && typeof trainerData === 'object') {
    return `${trainerData.first_name || 'Unknown'} ${trainerData.last_name || 'Trainer'}`;
  }
  
  return 'Unknown Trainer';
};

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  /** -1 = guest; >0 = subscription id. Auto-filled on select as default help. */
  const [memberSubscriptionSelections, setMemberSubscriptionSelections] = useState<Record<string, number>>({});
  const [memberManagementOpen, setMemberManagementOpen] = useState(false);
  const [showOtherMembers, setShowOtherMembers] = useState(false);
  const courseId = params.id as string;
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("manageMembers") === "1") {
      setMemberManagementOpen(true);
      router.replace(`/admin/courses/${courseId}`);
    }
  }, [searchParams, courseId, router]);

  const [participantsPage, setParticipantsPage] = useState(1);
  const PARTICIPANTS_PER_PAGE = 12;

  const { data: course, isLoading, error } = useCourse(parseInt(courseId));

  // Fetch all members for management
  const { data: allMembers = [] } = useMembers();

  const deleteCourseMutation = useDeleteCourse();
  const addMembersToCourseMutation = useAddMembersToCourse();
  const checkInMutation = useCheckInRegistration();

  const courseGroupIdForSelection = () =>
    (course as CourseDetails | undefined)?.class?.category?.group?.id ?? null;

  const defaultSubscriptionForMember = (member: any) => {
    const courseDate = (course as CourseDetails | undefined)?.course_date;
    if (!courseDate) return null;
    const picked = pickSubscriptionForCourse(
      member?.subscriptions,
      courseDate,
      courseGroupIdForSelection(),
    );
    return picked?.id ?? null;
  };

  // Member management functions
  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        setMemberSubscriptionSelections((sels) => {
          const next = { ...sels };
          delete next[memberId];
          return next;
        });
        return prev.filter((id) => id !== memberId);
      }
      const member = allMembers.find((m: any) => m.id === memberId);
      const defaultSubId = defaultSubscriptionForMember(member);
      setMemberSubscriptionSelections((sels) => ({
        ...sels,
        // No usable sub → guest; otherwise default pick as help
        [memberId]: defaultSubId ?? -1,
      }));
      return [...prev, memberId];
    });
  };

  const handleMemberExpand = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleAddMembers = () => {
    const courseDate = (course as CourseDetails | undefined)?.course_date;
    const membersNeedingSelection = selectedMembers.filter((memberId) => {
      const member = allMembers.find((m: any) => m.id === memberId);
      if (!member || !courseDate) return false;
      return (
        usableSubscriptionsForCourse(
          member.subscriptions,
          courseDate,
          courseGroupIdForSelection(),
        ).length > 0
      );
    });

    const membersWithoutSelection = membersNeedingSelection.filter(
      (memberId) => !memberSubscriptionSelections[memberId],
    );

    if (membersWithoutSelection.length > 0) {
      toast({
        title: 'Registration Selection Required',
        description: `Please select a subscription or guest registration for ${membersWithoutSelection.length} member(s) with subscriptions covering this course.`,
        variant: 'destructive',
      });
      return;
    }

    proceedWithMemberAddition();
  };

  const proceedWithMemberAddition = () => {
    if (!course) return;
    
    addMembersToCourseMutation.mutate({
      courseId: course.id,
      data: { 
        memberIds: selectedMembers,
        subscriptionSelections: memberSubscriptionSelections,
      }
    }, {
      onSuccess: (result) => {
        toast({
          title: 'Members Added',
          description: result.message,
        });
        setMemberManagementOpen(false);
        setSelectedMembers([]);
        setMemberSubscriptionSelections({});
      },
      onError: (error: any) => {
        console.error('Error adding members:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to add members. Please try again.',
          variant: 'destructive'
        });
      }
    });
  };

  const handleCancelRegistration = (registration: any) => {
    const memberName = `${registration.member?.first_name || 'Unknown'} ${registration.member?.last_name || 'Member'}`;
    const memberId = registration.member_id || registration.member?.id || '';
    const qs = new URLSearchParams({
      registrationId: String(registration.id),
      memberName,
      memberId: String(memberId),
    });
    if (registration.subscription_id) {
      qs.set('subscriptionId', String(registration.subscription_id));
    }
    router.push(`/admin/courses/${courseId}/cancel?${qs.toString()}`);
  };

  const handleDeleteRegistration = (registration: any) => {
    const memberName = `${registration.member?.first_name || 'Unknown'} ${registration.member?.last_name || 'Member'}`;
    const memberId = registration.member_id || registration.member?.id || '';
    const qs = new URLSearchParams({
      registrationId: String(registration.id),
      memberName,
      memberId: String(memberId),
      status: String(registration.status || ''),
    });
    if (registration.subscription_id) {
      qs.set('subscriptionId', String(registration.subscription_id));
    }
    router.push(`/admin/courses/${courseId}/delete-registration?${qs.toString()}`);
  };

  const handleRestoreRegistration = (registration: any) => {
    const memberName = `${registration.member?.first_name || 'Unknown'} ${registration.member?.last_name || 'Member'}`;
    const memberId = registration.member_id || registration.member?.id || '';
    const qs = new URLSearchParams({
      registrationId: String(registration.id),
      memberName,
      memberId: String(memberId),
    });
    if (registration.subscription_id) {
      qs.set('subscriptionId', String(registration.subscription_id));
    }
    if (course?.course_date) {
      qs.set('courseDate', String(course.course_date).slice(0, 10));
    }
    const groupId = course?.class?.category?.group?.id;
    if (groupId != null) {
      qs.set('courseGroupId', String(groupId));
    }
    router.push(`/admin/courses/${courseId}/restore?${qs.toString()}`);
  };


  // Function to check if a member has remaining sessions for this course's group
  const checkMemberSessionsMutation = useCheckMemberSessions();
  
  const checkMemberSessions = async (memberId: string) => {
    try {
      const response = await checkMemberSessionsMutation.mutateAsync({
        memberId,
        courseId: parseInt(courseId)
      });
      return response;
    } catch (error) {
      console.error('Error checking member sessions:', error);
      return { can_register: false, error: 'Failed to check sessions' };
    }
  };

  const handleSelectAll = () => {
    const members = getFilteredMembers();
    setSelectedMembers(members.map((member: any) => member.id));
    setMemberSubscriptionSelections((prev) => {
      const next = { ...prev };
      for (const member of members) {
        if (next[member.id]) continue;
        const defaultSubId = defaultSubscriptionForMember(member);
        next[member.id] = defaultSubId ?? -1;
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedMembers([]);
    setMemberSubscriptionSelections({});
  };

  // Handle QR button click - navigate to QR check-in page
  const handleQRClick = (qrCode: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the row click from firing
    if (qrCode) {
      router.push(`/admin/checkins/qr/${encodeURIComponent(qrCode)}`);
    } else {
      toast({
        title: 'Error',
        description: 'No QR code found for this registration',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading course details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The course you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push('/admin/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  const courseData = course as CourseDetails;

  const participantsTotalPages = Math.max(
    1,
    Math.ceil(courseData.registrations.length / PARTICIPANTS_PER_PAGE),
  );
  const safeParticipantsPage = Math.min(participantsPage, participantsTotalPages);
  const paginatedRegistrations = courseData.registrations.slice(
    (safeParticipantsPage - 1) * PARTICIPANTS_PER_PAGE,
    safeParticipantsPage * PARTICIPANTS_PER_PAGE,
  );

  const courseDeleteBlockReason = assertCourseDeletableWithAutoCancel(
    {
      course_date: courseData.course_date,
      start_time: courseData.start_time,
    },
    courseData.registrations.map((r: any) => ({
      id: r.id,
      status: r.status,
      member_id: r.member_id ?? r.member?.id,
    })),
    courseData.checkins.map((c: any) => ({
      registration_id: c.registration_id,
    }))
  );
  const canDeleteThisCourse = courseDeleteBlockReason === null;

  const getCourseGroupId = () => courseData?.class?.category?.group?.id;

  const memberEligibleForCourse = (member: any) =>
    memberCoversCourseOnDate(
      member,
      courseData.course_date,
      getCourseGroupId(),
    );

  const getAvailableMembers = () => {
    if (!courseData || !allMembers) return [];
    // Cancelled regs must not block re-registration
    const registeredIds = courseData.registrations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => r.member?.id)
      .filter(Boolean);
    return allMembers.filter((member: any) => !registeredIds.includes(member.id));
  };

  const getFilteredMembers = () => {
    let available = getAvailableMembers();
    if (!showOtherMembers) {
      available = available.filter(memberEligibleForCourse);
    }
    if (!searchTerm) return available;
    return available.filter((member: any) =>
      `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${courseData.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground font-mono">
                {courseData.code || `CRS-${String(courseData.id).padStart(5, '0')}`}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{courseData.class.name}</h1>
            <p className="text-muted-foreground">
              {formatDate(courseData.course_date)} • {formatTime(courseData.start_time)} - {formatTime(courseData.end_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(courseData.status)} flex items-center gap-1`}>
            {getStatusIcon(courseData.status)}
            {courseData.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}/delete`)}
            className="text-red-600 hover:text-red-700"
            disabled={!canDeleteThisCourse}
            title={
              courseDeleteBlockReason
                ? describeCourseDeleteBlockReason(courseDeleteBlockReason)
                : undefined
            }
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Course Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Class Name</label>
                  <p className="text-lg font-semibold">{courseData.class.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: courseData.class.category.color }}
                    />
                    <span className="font-medium">{courseData.class.category.name}</span>
                    {courseData.class.category.group?.name && (
                      <Badge variant="outline" className="text-xs">
                        {courseData.class.category.group.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    {courseData.class.duration} minutes
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(courseData.class.difficulty)
                      ? courseData.class.difficulty
                      : [courseData.class.difficulty]
                    ).map((level: string) => (
                      <Badge key={level} className={getDifficultyColor(level)}>
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {courseData.class.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1">{courseData.class.description}</p>
                </div>
              )}

              {courseData.class.equipment && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Required Equipment</label>
                  <p className="text-sm mt-1">{courseData.class.equipment}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trainer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Trainer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback>
                    {courseData.trainer.member?.first_name?.[0] || 'T'}{courseData.trainer.member?.last_name?.[0] || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {courseData.trainer.member?.first_name || 'Unknown'} {courseData.trainer.member?.last_name || 'Trainer'}
                    </h3>
                    <p className="text-muted-foreground">{courseData.trainer.specialization}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{courseData.trainer.member?.email || 'No email'}</span>
                    </div>
                    {courseData.trainer.member?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{courseData.trainer.member?.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>{courseData.trainer.experience_years} years experience</span>
                    </div>
                    {courseData.trainer.certification && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-muted-foreground" />
                        <span>{courseData.trainer.certification}</span>
                      </div>
                    )}
                  </div>

                  {courseData.trainer.bio && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bio</label>
                      <p className="text-sm mt-1">{courseData.trainer.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({courseData.registrations.length})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/admin/courses/${courseId}/members`)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {courseData.registrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground px-6">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants registered yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 p-6">
                    {paginatedRegistrations.map((registration) => {
                      const checkin = courseData.checkins.find(
                        (c) =>
                          c.registration_id === registration.id ||
                          c.member?.id === registration.member?.id
                      );

                      return (
                        <div 
                          key={registration.id} 
                          className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            const memberId = registration.member?.id;
                            if (memberId) {
                              router.push(`/admin/members/${memberId}`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar>
                              <AvatarFallback>
                                {registration.member?.first_name?.[0] || 'U'}{registration.member?.last_name?.[0] || 'M'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {registration.member?.first_name || 'Unknown'} {registration.member?.last_name || 'Member'}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{registration.member?.email || 'No email'}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-mono">
                                  REG-{String(registration.id).padStart(5, '0')}
                                </span>
                                <span>
                                  Registered {formatDateTime(registration.registration_date)}
                                </span>
                                <span>
                                  {registration.subscription_id
                                    ? `Subscription #${registration.subscription_id}`
                                    : 'Guest'}
                                </span>
                                {checkin?.checkin_time && (
                                  <span>
                                    Checked in {formatDateTime(checkin.checkin_time)}
                                  </span>
                                )}
                              </div>
                              {registration.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{registration.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleQRClick(registration.qr_code, e)}
                              className="h-8 w-8 p-0"
                              title="Open QR Check-in Page"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                registration.status === 'attended'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : registration.status === 'absent'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : registration.status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              {registration.status === 'attended' ? 'Attended' :
                               registration.status === 'absent' ? 'Absent' :
                               registration.status === 'cancelled' ? 'Cancelled' :
                               registration.status === 'registered' ? 'Registered' :
                               registration.status}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Open registration actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={(e) => handleQRClick(registration.qr_code, e)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                {(registration.status === 'registered' || registration.status === 'absent') && (
                                  <DropdownMenuItem
                                    disabled={checkInMutation.isPending}
                                    onClick={() => checkInMutation.mutate(registration.id)}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Check in
                                  </DropdownMenuItem>
                                )}
                                {registration.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={() => handleCancelRegistration(registration)}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}
                                {registration.status === 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={() => handleRestoreRegistration(registration)}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteRegistration(registration)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {courseData.registrations.length > PARTICIPANTS_PER_PAGE && (
                    <div className="flex items-center justify-between px-6 py-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((safeParticipantsPage - 1) * PARTICIPANTS_PER_PAGE) + 1} to{' '}
                        {Math.min(safeParticipantsPage * PARTICIPANTS_PER_PAGE, courseData.registrations.length)} of{' '}
                        {courseData.registrations.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setParticipantsPage(safeParticipantsPage - 1)}
                          disabled={safeParticipantsPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm whitespace-nowrap">
                          Page {safeParticipantsPage} of {participantsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setParticipantsPage(safeParticipantsPage + 1)}
                          disabled={safeParticipantsPage === participantsTotalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{courseData.statistics.totalRegistrations}</div>
                  <div className="text-sm text-muted-foreground">Registrations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{courseData.statistics.totalCheckins}</div>
                  <div className="text-sm text-muted-foreground">Check-ins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{courseData.statistics.attendanceRate}%</div>
                  <div className="text-sm text-muted-foreground">Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{courseData.statistics.availableSpots}</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Capacity</span>
                  <span className={courseData.current_participants > courseData.max_participants ? 'text-red-600 font-medium' : ''}>
                    {courseData.current_participants}/{courseData.max_participants}
                    {courseData.current_participants > courseData.max_participants && ' (Over capacity)'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      courseData.current_participants > courseData.max_participants 
                        ? 'bg-red-500' 
                        : 'bg-primary'
                    }`}
                    style={{ 
                      width: `${Math.min((courseData.current_participants / courseData.max_participants) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Course Date</label>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(courseData.course_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatTime(courseData.start_time)} - {formatTime(courseData.end_time)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Repetition Type</label>
                  <p className="capitalize">{courseData.schedule.repetition_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Day of Week</label>
                  <p>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][courseData.schedule.day_of_week]}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Schedule ID</label>
                  <p className="flex items-center gap-2">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80"
                      onClick={() => router.push(`/admin/schedules/${courseData.schedule.id}`)}
                    >
                      View Schedule #{courseData.schedule.id}
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Differences Section */}
          {courseData.isEdited && courseData.differences && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  Course Modifications
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Edited
                  </Badge>
                </CardTitle>
                <CardDescription>
                  This course has been modified from its original schedule. Changes are highlighted below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseData.differences.trainer && (
                    <div className="flex items-center justify-between p-3 bg-orange-100/50 rounded-lg border border-orange-200">
                      <div>
                        <label className="text-sm font-medium text-orange-800">Trainer Changed</label>
                        <div className="text-sm text-orange-700">
                          <span className="line-through">{getTrainerName(courseData.differences.trainer.original, courseData)}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{getTrainerName(courseData.differences.trainer.current, courseData)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {courseData.differences.startTime && (
                    <div className="flex items-center justify-between p-3 bg-orange-100/50 rounded-lg border border-orange-200">
                      <div>
                        <label className="text-sm font-medium text-orange-800">Start Time Changed</label>
                        <div className="text-sm text-orange-700">
                          <span className="line-through">{formatTime(courseData.differences.startTime.original)}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{formatTime(courseData.differences.startTime.current)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {courseData.differences.endTime && (
                    <div className="flex items-center justify-between p-3 bg-orange-100/50 rounded-lg border border-orange-200">
                      <div>
                        <label className="text-sm font-medium text-orange-800">End Time Changed</label>
                        <div className="text-sm text-orange-700">
                          <span className="line-through">{formatTime(courseData.differences.endTime.original)}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{formatTime(courseData.differences.endTime.current)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {courseData.differences.maxParticipants && (
                    <div className="flex items-center justify-between p-3 bg-orange-100/50 rounded-lg border border-orange-200">
                      <div>
                        <label className="text-sm font-medium text-orange-800">Max Participants Changed</label>
                        <div className="text-sm text-orange-700">
                          <span className="line-through">{courseData.differences.maxParticipants.original}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{courseData.differences.maxParticipants.current}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Member Management Dialog */}
      <Dialog
        open={memberManagementOpen}
        onOpenChange={(open) => {
          setMemberManagementOpen(open);
          if (!open) {
            setShowOtherMembers(false);
            setSearchTerm('');
            setSelectedMembers([]);
            setMemberSubscriptionSelections({});
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Manage Course Members
            </DialogTitle>
            <DialogDescription>
              Add or remove members from this course. Current capacity: {courseData.current_participants}/{courseData.max_participants}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 p-1">
            {/* Search and Controls */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showOtherMembers ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOtherMembers((v) => !v)}
                >
                  <Users className="w-4 h-4 mr-1" />
                  {showOtherMembers ? 'Eligible only' : 'Show other members'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  <Square className="w-4 h-4 mr-1" />
                  Deselect All
                </Button>
              </div>
            </div>

            {!showOtherMembers && (
              <p className="text-xs text-muted-foreground">
                Showing members whose subscription covered this course on{' '}
                {formatDate(courseData.course_date)} (with remaining sessions).
                Use &quot;Show other members&quot; for guest registration.
              </p>
            )}

            {/* Members List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {getFilteredMembers().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {showOtherMembers
                      ? 'No available members found'
                      : 'No members with a subscription for this course'}
                  </p>
                  {!showOtherMembers && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setShowOtherMembers(true)}
                    >
                      Show other members
                    </Button>
                  )}
                </div>
              ) : (
                getFilteredMembers().map((member: any) => {
                  const courseGroupId = courseData?.class?.category?.group?.id;
                  const usableSubs = usableSubscriptionsForCourse(
                    member.subscriptions,
                    courseData.course_date,
                    courseGroupId,
                  );
                  const remainingSessions =
                    usableSubs.reduce((sum, sub) => {
                      const gs = (member.groupSessions || []).find(
                        (g: any) =>
                          g.subscription_id === sub.id &&
                          g.group_id === courseGroupId,
                      );
                      const ps = (member.poolSessions || []).find(
                        (p: any) =>
                          p.subscription_id === sub.id &&
                          (p.group_ids || []).includes(courseGroupId),
                      );
                      return (
                        sum +
                        (gs?.sessions_remaining || 0) +
                        (ps?.sessions_remaining || 0)
                      );
                    }, 0);
                  const isExpanded = expandedMembers.has(member.id);
                  const hasUsableSubscriptions = usableSubs.length > 0;
                  
                  return (
                    <div
                      key={member.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Member Header */}
                      <div
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleMemberExpand(member.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => handleMemberSelect(member.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar>
                            <AvatarFallback>
                              {member.first_name?.[0] || 'M'}{member.last_name?.[0] || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.first_name || 'Unknown'} {member.last_name || 'Member'}
                            </p>
                            <p className="text-sm text-muted-foreground">{member.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {remainingSessions > 0 ? `${remainingSessions} sessions left` : 'No sessions'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hasUsableSubscriptions
                                ? `${usableSubs.length} subscription${usableSubs.length !== 1 ? 's' : ''} usable`
                                : 'No subscription'}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.phone || 'No phone'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Member Details */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Phone:</span> {member.phone || 'Not provided'}
                            </div>
                            <div>
                              <span className="font-medium">Member ID:</span> {member.id}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
                              <Checkbox
                                id={`guest-${member.id}`}
                                checked={memberSubscriptionSelections[member.id] === -1}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setMemberSubscriptionSelections((prev) => ({
                                      ...prev,
                                      [member.id]: -1,
                                    }));
                                  } else {
                                    const defaultSubId = defaultSubscriptionForMember(member);
                                    setMemberSubscriptionSelections((prev) => {
                                      const next = { ...prev };
                                      if (defaultSubId != null) next[member.id] = defaultSubId;
                                      else delete next[member.id];
                                      return next;
                                    });
                                  }
                                }}
                              />
                              <label
                                htmlFor={`guest-${member.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div>
                                  <h5 className="font-medium text-sm text-blue-800">Register as Guest</h5>
                                  <p className="text-xs text-blue-600">
                                    Free guest — no subscription sessions used
                                  </p>
                                </div>
                              </label>
                            </div>

                            {hasUsableSubscriptions && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  <span className="font-medium text-sm">
                                    Or select subscription:
                                  </span>
                                </div>
                                <RadioGroup
                                  value={
                                    memberSubscriptionSelections[member.id] > 0
                                      ? memberSubscriptionSelections[member.id]?.toString()
                                      : ''
                                  }
                                  onValueChange={(value) => {
                                    setMemberSubscriptionSelections((prev) => ({
                                      ...prev,
                                      [member.id]: parseInt(value),
                                    }));
                                  }}
                                  className="space-y-2"
                                >
                                  {usableSubs.map((sub: any) => {
                                    const dedicated = (member.groupSessions || []).find(
                                      (gs: any) =>
                                        gs.subscription_id === sub.id &&
                                        gs.group_id === courseGroupId,
                                    );
                                    const pools = (member.poolSessions || []).filter(
                                      (ps: any) =>
                                        ps.subscription_id === sub.id &&
                                        (ps.group_ids || []).includes(courseGroupId) &&
                                        ps.sessions_remaining > 0,
                                    );
                                    return (
                                      <div
                                        key={`${member.id}-sub-${sub.id}`}
                                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                      >
                                        <RadioGroupItem
                                          value={sub.id.toString()}
                                          id={`${member.id}-sub-${sub.id}`}
                                        />
                                        <label
                                          htmlFor={`${member.id}-sub-${sub.id}`}
                                          className="flex-1 cursor-pointer"
                                        >
                                          <h5 className="font-medium text-sm">
                                            Subscription #{sub.id}
                                          </h5>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDateRange(sub.start_date, sub.end_date)}
                                            {sub.status ? ` · ${sub.status}` : ''}
                                          </p>
                                          {dedicated && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {dedicated.group_name}: {dedicated.sessions_remaining}/{dedicated.total_sessions} dedicated
                                            </p>
                                          )}
                                          {pools.map((poolSession: any) => (
                                            <p
                                              key={`${sub.id}-pool-${poolSession.pool_id}`}
                                              className="text-xs text-muted-foreground mt-0.5"
                                            >
                                              Pool
                                              {poolSession.group_names?.length
                                                ? ` (${poolSession.group_names.join(', ')})`
                                                : ''}
                                              : {poolSession.sessions_remaining}/{poolSession.total_sessions}
                                            </p>
                                          ))}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selection Summary */}
            {selectedMembers.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-muted-foreground">
                  Will be added to the course
                </p>
                {(() => {
                  const membersWithUsableSubs = selectedMembers.filter((memberId) => {
                    const member = allMembers.find((m: any) => m.id === memberId);
                    return (
                      usableSubscriptionsForCourse(
                        member?.subscriptions,
                        courseData.course_date,
                        getCourseGroupId(),
                      ).length > 0
                    );
                  });

                  const membersWithoutSelection = membersWithUsableSubs.filter(
                    (memberId) => !memberSubscriptionSelections[memberId],
                  );

                  const guestMembers = selectedMembers.filter(
                    (memberId) => memberSubscriptionSelections[memberId] === -1,
                  );

                  const subscriptionMembers = selectedMembers.filter(
                    (memberId) =>
                      (memberSubscriptionSelections[memberId] ?? 0) > 0,
                  );

                  if (membersWithUsableSubs.length > 0) {
                    return (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-800">
                          {membersWithUsableSubs.length} member
                          {membersWithUsableSubs.length !== 1 ? 's have' : ' has'} usable
                          subscription{membersWithUsableSubs.length !== 1 ? 's' : ''}.
                          {membersWithoutSelection.length > 0 ? (
                            <span className="block mt-1 text-red-600">
                              {membersWithoutSelection.length} need a subscription or guest pick — expand to choose.
                            </span>
                          ) : (
                            <span className="block mt-1 text-green-600">
                              Ready: {subscriptionMembers.length} via subscription, {guestMembers.length} as guest.
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-xs text-green-800">
                          All selected members will be added as free guests (no subscription sessions).
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberManagementOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedMembers.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Selected Members ({selectedMembers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}