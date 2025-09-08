"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/data-table";

import { Calendar, User, Clock, Users, Trash2, Eye, X, CheckCircle, XCircle, AlertCircle, Activity, MapPin } from "lucide-react";
import { getDayName, formatTime } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { useRegistrations, useDeleteRegistration } from "@/hooks/useRegistrations";
import { useAdminClasses } from "@/hooks/useAdmin";
import { useTrainers } from "@/hooks/useTrainers";
import { useSchedules } from "@/hooks/useSchedules";
import { useCourses } from "@/hooks/useCourse";
import { useMembers } from "@/hooks/useMembers";

// Utility function for European date formatting (DD/MM/YYYY)
const formatEuropeanDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function AdminRegistrations() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [registrationToView, setRegistrationToView] = useState<any>(null);
  
  const { toast } = useToast();

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Initialize filters from URL parameters after hydration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: Record<string, string> = {};
    
    console.log('URL params:', Object.fromEntries(urlParams.entries()));
    
    // Handle scheduleId filter
    if (urlParams.get('scheduleId')) {
      initialFilters['course.schedule_id'] = urlParams.get('scheduleId') || '';
      console.log('Setting schedule filter:', initialFilters['course.schedule_id']);
    }
    
    // Handle status filter (comma-separated)
    if (urlParams.get('status')) {
      initialFilters['status'] = urlParams.get('status') || '';
      console.log('Setting status filter:', initialFilters['status']);
    }
    
    // Handle other filters
    ['classId', 'trainerId', 'memberId', 'dateFrom', 'dateTo', 'courseId', 'registrationDateFrom', 'registrationDateTo'].forEach(param => {
      if (urlParams.get(param)) {
        initialFilters[param] = urlParams.get(param) || '';
      }
    });
    
    console.log('Initial filters:', initialFilters);
    
    // Only update if there are filters to set
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
      console.log('Filters set successfully');
    }
  }, []);

  const { data: registrations = [], isLoading, error } = useRegistrations();
  const { data: classes = [] } = useAdminClasses();
  const { data: trainers = [] } = useTrainers();
  const { data: schedules = [] } = useSchedules();
  const { data: courses = [] } = useCourses();
  const { data: members = [] } = useMembers();

  const deleteRegistrationMutation = useDeleteRegistration();

  const handleDelete = (registration: any) => {
    setRegistrationToDelete(registration);
    setDeleteDialogOpen(true);
  };

  const handleView = (registration: any) => {
    setRegistrationToView(registration);
    setViewDialogOpen(true);
  };

  const confirmDelete = () => {
    if (registrationToDelete) {
      deleteRegistrationMutation.mutate(registrationToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setRegistrationToDelete(null);
        }
      });
    }
  };

  const handleBulkAction = (action: string, selectedIds: number[]) => {
    if (action === "delete") {
      // For bulk delete, we'll need to create a custom hook or handle it differently
      // For now, we'll delete them one by one
      selectedIds.forEach(id => {
        deleteRegistrationMutation.mutate(id);
      });
    }
  };

  const handleExport = (data: any[]) => {
    const headers = [
      'ID', 'Member', 'Email', 'Class', 'Course Date', 'Start Time', 'End Time', 
      'Trainer', 'Status', 'Registration Date', 'Schedule ID', 'Course ID'
    ];
    
    const csvData = data.map((reg: any) => [
      reg.id,
      `${reg.member?.first_name} ${reg.member?.last_name}`,
      reg.member?.email || '',
      reg.course?.class?.name || '',
      reg.course?.course_date || '',
      reg.course?.start_time || '',
      reg.course?.end_time || '',
      `${reg.course?.trainer?.user?.first_name} ${reg.course?.trainer?.user?.last_name}`,
      reg.status,
      reg.registration_date,
      reg.course?.schedule_id || '',
      reg.course?.id || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const refreshData = () => {
    // The data will be refreshed automatically by React Query
    toast({ title: "Data refreshed" });
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Registered</Badge>;
      case 'attended':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Attended</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'no_show':
        return <Badge variant="secondary">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <AlertCircle className="w-4 h-4 text-primary" />;
      case 'attended':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no_show':
        return <X className="w-4 h-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Define columns for the datatable
  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      sortable: true,
      render: (value: any) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'member',
      label: 'Member',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.member?.first_name} {row.member?.last_name}</div>
            <div className="text-xs text-muted-foreground">{row.member?.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'class',
      label: 'Class',
      sortable: true,
      render: (value: any, row: any) => (
        <div>
          <div className="font-medium">{row.course?.class?.name}</div>
          <div className="text-xs text-muted-foreground">{row.course?.class?.category?.name}</div>
        </div>
      )
    },
    {
      key: 'course_date',
      label: 'Course Date',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{formatEuropeanDate(row.course?.course_date)}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(row.course?.start_time)} - {formatTime(row.course?.end_time)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'trainer',
      label: 'Trainer',
      sortable: true,
      render: (value: any, row: any) => (
        <div>
          <div className="font-medium">
            {row.course?.trainer?.user?.first_name} {row.course?.trainer?.user?.last_name}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          {getStatusBadge(row.status)}
        </div>
      )
    },
    {
      key: 'registration_date',
      label: 'Registered',
      sortable: true,
      render: (value: any) => (
        <div className="text-sm">
          {formatEuropeanDate(value)}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (value: any, row: any) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleView(row);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Define grouping options
  const groupOptions = [
    { key: 'status', label: 'Status' },
    { key: 'course.class.name', label: 'Class' },
    { key: 'course.trainer.user.first_name', label: 'Trainer' },
    { key: 'course.course_date', label: 'Course Date' },
    { key: 'registration_date', label: 'Registration Date' },
    { key: 'member.first_name', label: 'Member' }
  ];

  // Define filter options
  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'registered', label: 'Registered' },
        { value: 'attended', label: 'Attended' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_show', label: 'No Show' },
        { value: 'registered,attended', label: 'Registered & Attended' }
      ]
    },
    {
      key: 'course.class.name',
      label: 'Class',
      type: 'select' as const,
      options: classes.map((cls: any) => ({
        value: cls.name,
        label: cls.name
      }))
    },
    {
      key: 'course.trainer.user.first_name',
      label: 'Trainer',
      type: 'select' as const,
      options: trainers.map((trainer: any) => ({
        value: `${trainer.first_name} ${trainer.last_name}`,
        label: `${trainer.first_name} ${trainer.last_name}`
      }))
    },
    {
      key: 'member.first_name',
      label: 'Member',
      type: 'select' as const,
      options: members.map((member: any) => ({
        value: `${member.first_name} ${member.last_name}`,
        label: `${member.first_name} ${member.last_name}`
      }))
    },
    {
      key: 'course.schedule_id',
      label: 'Schedule',
      type: 'select' as const,
      options: schedules.map((schedule: any) => ({
        value: schedule.id.toString(),
        label: schedule.code || `SCH-${schedule.id}`
      }))
    },
    {
      key: 'course.course_date',
      label: 'Course Date From',
      type: 'date' as const
    },
    {
      key: 'registration_date',
      label: 'Registration Date From',
      type: 'date' as const
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={registrations}
        columns={columns}
        groupOptions={groupOptions}
        filterOptions={filterOptions}
        onRowClick={handleView}
        onBulkAction={handleBulkAction}
        onRefresh={refreshData}
        loading={isLoading}
        title="Registrations"
        description="Manage member registrations and attendance"
        searchable={true}
        selectable={true}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this registration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteRegistrationMutation.isPending}
            >
              {deleteRegistrationMutation.isPending ? "Deleting..." : "Delete Registration"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Registration Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              View detailed information about this registration
            </DialogDescription>
          </DialogHeader>
          {registrationToView && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member</label>
                  <p className="text-sm">
                    {registrationToView.member?.first_name} {registrationToView.member?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{registrationToView.member?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(registrationToView.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Class</label>
                  <p className="text-sm">{registrationToView.course?.class?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Trainer</label>
                  <p className="text-sm">
                    {registrationToView.course?.trainer?.user?.first_name} {registrationToView.course?.trainer?.user?.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-sm">{formatEuropeanDate(registrationToView.course?.course_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <p className="text-sm">
                    {formatTime(registrationToView.course?.start_time)} - {formatTime(registrationToView.course?.end_time)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                  <p className="text-sm">{formatEuropeanDate(registrationToView.registration_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration ID</label>
                  <p className="text-sm font-mono">{registrationToView.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}