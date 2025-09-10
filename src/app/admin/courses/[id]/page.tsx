"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { 
  useCourse, 
  useDeleteCourse, 
  useAddMembersToCourse 
} from '@/hooks/useCourse';
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
  Square
} from 'lucide-react';
import { formatTime, formatDate } from '@/lib/date';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CourseDetails {
  id: number;
  schedule_id: number;
  class_id: number;
  trainer_id: number;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class: {
    id: number;
    name: string;
    description?: string;
    duration: number;
    max_capacity: number;
    equipment?: string;
    difficulty: string;
    is_active: boolean;
    category: {
      id: number;
      name: string;
      color: string;
      group: {
        id: number;
        name: string;
        color: string;
      };
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

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberManagementOpen, setMemberManagementOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const courseId = params.id as string;

  const { data: course, isLoading, error } = useCourse(parseInt(courseId));

  // Fetch all members for management
  const { data: allMembers = [] } = useMembers();

  const deleteCourseMutation = useDeleteCourse();
  const addMembersToCourseMutation = useAddMembersToCourse();


  // Member management functions
  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
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
    const availableMembers = getAvailableMembers();
    setSelectedMembers(availableMembers.map((member: any) => member.id));
  };

  const handleDeselectAll = () => {
    setSelectedMembers([]);
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

  const getAvailableMembers = () => {
    if (!courseData || !allMembers) return [];
    const registeredIds = courseData.registrations.map(r => r.member?.id).filter(Boolean);
    return allMembers.filter((member: any) => !registeredIds.includes(member.id));
  };

  const getFilteredMembers = () => {
    const available = getAvailableMembers();
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
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 hover:text-red-700"
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
                    <Badge variant="outline" className="text-xs">
                      {courseData.class.category.group.name}
                    </Badge>
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
                  <Badge className={getDifficultyColor(courseData.class.difficulty)}>
                    {courseData.class.difficulty}
                  </Badge>
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
                  <span>{courseData.current_participants}/{courseData.max_participants}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(courseData.current_participants / courseData.max_participants) * 100}%` 
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
              onClick={() => setMemberManagementOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Members
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {courseData.registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No participants registered yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseData.registrations.map((registration) => {
                const hasCheckedIn = courseData.checkins.some(
                  checkin => checkin.member?.id === registration.member?.id
                );
                
                return (
                  <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {registration.member?.first_name?.[0] || 'U'}{registration.member?.last_name?.[0] || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {registration.member?.first_name || 'Unknown'} {registration.member?.last_name || 'Member'}
                        </p>
                        <p className="text-sm text-muted-foreground">{registration.member?.email || 'No email'}</p>
                        {registration.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{registration.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={hasCheckedIn ? "default" : "secondary"}>
                        {hasCheckedIn ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Checked In
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Not Checked In
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {registration.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Management Dialog */}
      <Dialog open={memberManagementOpen} onOpenChange={setMemberManagementOpen}>
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

            {/* Members List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {getFilteredMembers().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No available members found</p>
                </div>
              ) : (
                getFilteredMembers().map((member: any) => {
                  // Get remaining sessions for this course's group
                  const courseGroupId = course?.class?.category?.group?.id;
                  const groupSession = member.groupSessions?.find((gs: any) => gs.group_id === courseGroupId);
                  const remainingSessions = groupSession?.sessions_remaining || 0;
                  const totalSessions = groupSession?.total_sessions || 0;
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => handleMemberSelect(member.id)}
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
                        {/* Simple remaining sessions display */}
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {remainingSessions > 0 ? `${remainingSessions} sessions left` : 'No sessions'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalSessions > 0 ? `of ${totalSessions} total` : 'No subscription'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.phone || 'No phone'}
                        </Badge>
                      </div>
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
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                ℹ️ <strong>Note:</strong> Members with remaining sessions will have sessions deducted from their group allocation. Members without sessions will be added as free guests.
              </p>
            </div>
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
              onClick={() => {
                addMembersToCourseMutation.mutate({
                  courseId: course.id,
                  data: { memberIds: selectedMembers }
                }, {
                  onSuccess: (result) => {
                    toast({
                      title: 'Members Added',
                      description: result.message,
                    });
                    setMemberManagementOpen(false);
                    setSelectedMembers([]);
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
              }}
              disabled={selectedMembers.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Selected Members ({selectedMembers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course? This action cannot be undone.
              {courseData.statistics.totalRegistrations > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This course has {courseData.statistics.totalRegistrations} registrations and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteCourseMutation.mutate(parseInt(courseId), {
                  onSuccess: () => {
                    toast({
                      title: 'Course deleted',
                      description: 'The course has been successfully deleted.',
                    });
                    router.push('/admin/courses');
                  },
                  onError: (error: any) => {
                    toast({
                      title: 'Error',
                      description: error.message || 'Failed to delete course',
                      variant: 'destructive',
                    });
                  },
                });
                setDeleteDialogOpen(false);
              }}
              disabled={courseData.statistics.totalRegistrations > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
