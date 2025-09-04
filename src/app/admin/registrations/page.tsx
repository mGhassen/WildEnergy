"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/data-table";

import { apiRequest } from "@/lib/queryClient";
import { Calendar, User, Clock, Users, Trash2, Eye, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { getDayName, formatTime } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";

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
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const initialFilters: Record<string, string> = {};
      
      // Handle scheduleId filter
      if (urlParams.get('scheduleId')) {
        initialFilters['course.schedule_id'] = urlParams.get('scheduleId') || '';
      }
      
      // Handle status filter (comma-separated)
      if (urlParams.get('status')) {
        initialFilters['status'] = urlParams.get('status') || '';
      }
      
      // Handle other filters
      ['classId', 'trainerId', 'memberId', 'dateFrom', 'dateTo', 'courseId', 'registrationDateFrom', 'registrationDateTo'].forEach(param => {
        if (urlParams.get(param)) {
          initialFilters[param] = urlParams.get(param) || '';
        }
      });
      
      return initialFilters;
    }
    return {};
  });

  const { data: registrations = [], isLoading, error } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      console.log('Fetching registrations...');
      try {
        const result = await apiRequest("GET", "/api/registrations");
        console.log('Registrations API result:', result);
        return result;
      } catch (err) {
        console.error('Registrations API error:', err);
        throw err;
      }
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: () => apiRequest("GET", "/api/admin/classes"),
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: () => apiRequest("GET", "/api/trainers"),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => apiRequest("GET", "/api/schedules"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest("GET", "/api/courses"),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => apiRequest("GET", "/api/members"),
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await apiRequest("DELETE", `/api/registrations/${id}`);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast({ title: "Registration deleted successfully" });
      setDeleteDialogOpen(false);
      setRegistrationToDelete(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting registration", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map(id => apiRequest("DELETE", `/api/registrations/${id}`));
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast({ title: "Registrations deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting registrations", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

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
      deleteRegistrationMutation.mutate(registrationToDelete.id);
    }
  };

  const handleBulkAction = (action: string, selectedIds: number[]) => {
    if (action === "delete") {
      bulkDeleteMutation.mutate(selectedIds);
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
    queryClient.invalidateQueries({ queryKey: ["registrations"] });
    toast({ title: "Data refreshed" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Registered</Badge>;
      case 'attended':
        return <Badge variant="default" className="bg-green-100 text-green-800">Attended</Badge>;
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
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'attended':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no_show':
        return <X className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
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
        { value: 'registered', label: 'Registered' },
        { value: 'attended', label: 'Attended' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_show', label: 'No Show' }
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
        label: `${schedule.code || `SCH-${schedule.id}`} - ${schedule.class?.name || 'Unknown Class'} - ${schedule.trainer?.first_name || ''} ${schedule.trainer?.last_name || ''}`.trim()
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
        initialFilters={filters}
        onRowClick={handleView}
        onBulkAction={handleBulkAction}
        onExport={handleExport}
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