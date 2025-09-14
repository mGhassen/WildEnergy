"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/data-table";
import { Loader2, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRegistrations } from "@/hooks/useRegistrations";
import { formatDateTime } from "@/lib/date";

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
    const router = useRouter();
    const { toast } = useToast();

    // Use hooks for data fetching
    const { data: registrations = [], isLoading, error } = useRegistrations();

    // Handle row click - redirect to QR checkin page
    const handleRowClick = (registration: any) => {
        // Use the actual QR code from the registration data
        const qrCode = registration.qr_code;
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

    // Define columns for DataTable
    const columns = [
        {
            key: "id",
            label: "ID",
            width: "100px",
            render: (value: any) => (
                <span className="font-mono text-xs">
                    REG-{String(value).padStart(5, '0')}
                </span>
            ),
        },
        {
            key: "member",
            label: "Member",
            width: "300px",
            render: (value: any) => (
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                            {value?.first_name} {value?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                            {value?.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "course_name",
            label: "Course",
            width: "250px",
            render: (value: any, row: any) => (
                <div className="min-w-0">
                    <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                        {row.course?.class?.name || 'Unknown Class'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                        {row.course?.class?.category?.name || 'No category'}
                    </div>
                </div>
            ),
        },
        {
            key: "course_datetime",
            label: "Date & Time",
            width: "200px",
            render: (value: any, row: any) => (
                <div className="min-w-0">
                    <div className="font-medium text-sm">
                        {formatEuropeanDate(row.course?.course_date || '')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {row.course?.start_time?.split(':').slice(0, 2).join(':')} - {row.course?.end_time?.split(':').slice(0, 2).join(':')}
                    </div>
                </div>
            ),
        },
        {
            key: "status",
            label: "Status",
            width: "100px",
            render: (value: any) => getStatusBadge(value),
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load registrations. Please try again.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
                <p className="text-muted-foreground">
                    Manage member registrations and view details
                </p>
            </div>
            <DataTable
                columns={columns}
                data={registrations}
                groupOptions={[
                    { key: "status", label: "Status" },
                    { key: "course_name", label: "Course" },
                    { key: "member", label: "Member" }
                ]}
                onRowClick={handleRowClick}
                title=""
                description=""
            />
        </div>
    );
}
