"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Eye, 
  User, 
  Calendar, 
  CreditCard, 
  Activity,
  Clock,
  CheckCircle,
  XCircle} from "lucide-react";
import { formatDate } from "@/lib/date";

// Types for member details
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  subscriptionStatus?: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt?: string;
  credit?: number;
}

interface Subscription {
  id: number;
  user_id: string;
  plan_id: number;
  startDate: string;
  endDate: string;
  sessionsRemaining: number;
  status: string;
  plan?: Plan;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  sessionsIncluded: number;
}

interface Registration {
  id: number;
  course_id: number;
  user_id: string;
  status: string;
  registration_date: string;
  qr_code: string;
  notes?: string;
}

interface Checkin {
  id: number;
  member: Member;
  checkin_time: string;
}

interface Payment {
  id: number;
  subscription_id: number;
  user_id: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  payment_date: string;
  transaction_id?: string;
  notes?: string;
}

interface MemberDetails {
  member: Member;
  subscriptions: Subscription[];
  registrations: Registration[];
  checkins: Checkin[];
  payments: Payment[];
}

// Helper functions
const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};

const getSubscriptionStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'expired': return 'bg-red-100 text-red-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getMemberStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'onhold': return 'bg-yellow-100 text-yellow-800';
    case 'suspended': return 'bg-red-100 text-red-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);

  // Fetch members with related data
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["/api/members"],
    queryFn: () => apiRequest("GET", "/api/members"),
  });

  // Map members from snake_case to camelCase for UI
  const mappedMembers: Member[] = Array.isArray(members)
    ? members.map((m: Record<string, unknown>) => ({
        ...m,
        firstName: typeof m.firstName === 'string' ? m.firstName : (typeof m.first_name === 'string' ? m.first_name : ''),
        lastName: typeof m.lastName === 'string' ? m.lastName : (typeof m.last_name === 'string' ? m.last_name : ''),
        email: typeof m.email === 'string' ? m.email : '',
        status: typeof m.status === 'string' ? m.status : '',
        subscriptionStatus: typeof m.subscriptionStatus === 'string' ? m.subscriptionStatus : (typeof m.subscription_status === 'string' ? m.subscription_status : 'inactive'),
        phone: typeof m.phone === 'string' ? m.phone : undefined,
        dateOfBirth: typeof m.dateOfBirth === 'string' ? m.dateOfBirth : (typeof m.date_of_birth === 'string' ? m.date_of_birth : undefined),
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : (typeof m.created_at === 'string' ? m.created_at : undefined),
        credit: typeof m.credit === 'number' ? m.credit : 0,
      }))
    : [];

  // Fetch member details when selected
  const { data: memberDetails, isLoading: isLoadingDetails } = useQuery<MemberDetails>({
    queryKey: ["/api/members", selectedMember?.id, "details"],
    queryFn: () => apiRequest("GET", `/api/members/${selectedMember?.id}/details`),
    enabled: !!selectedMember?.id,
  });

  // Helper function to safely get member details
  const getMemberDetails = () => {
    if (!memberDetails) return { subscriptions: [], payments: [], registrations: [], checkins: [] };
    return {
      subscriptions: memberDetails.subscriptions || [],
      payments: memberDetails.payments || [],
      registrations: memberDetails.registrations || [],
      checkins: memberDetails.checkins || []
    };
  };

  const memberData = getMemberDetails();

  // Map subscriptions to camelCase fields for status logic
  const mappedSubscriptions: Subscription[] = (memberData.subscriptions || []).map((sub: Record<string, unknown>) => ({
    ...sub,
    startDate: typeof sub.startDate === 'string' ? sub.startDate : (typeof sub.start_date === 'string' ? sub.start_date : ''),
    endDate: typeof sub.endDate === 'string' ? sub.endDate : (typeof sub.end_date === 'string' ? sub.end_date : ''),
    sessionsRemaining: typeof sub.sessionsRemaining === 'number' ? sub.sessionsRemaining : (typeof sub.sessions_remaining === 'number' ? sub.sessions_remaining : 0),
    status: typeof sub.status === 'string' ? sub.status : '',
    plan: sub.plan && typeof sub.plan === 'object' ? {
      ...sub.plan,
      sessionsIncluded: (sub.plan as any).sessionsIncluded ?? (sub.plan as any).max_sessions ?? 0,
      price: (sub.plan as any).price ?? 0,
      name: (sub.plan as any).name ?? '',
    } : undefined,
  }));

  // Helper function to get actual subscription status from subscription data

  // Helper to get the most relevant subscription (active, or most recent)
  const getRelevantSubscription = (subscriptions: Subscription[]) => {
    if (!subscriptions || subscriptions.length === 0) return null;
    // Prefer active subscriptions
    const active = subscriptions.find(sub => sub.status === 'active' && new Date(sub.endDate) > new Date() && sub.sessionsRemaining > 0);
    if (active) return active;
    // Otherwise, return the most recent by endDate
    return subscriptions.slice().sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    })[0];
  };
  const relevantSubscription = getRelevantSubscription(mappedSubscriptions);

  // Helper to get the most relevant subscription (active, or most recent) for a member

  // Filter members
  const filteredMembers = Array.isArray(mappedMembers) ? mappedMembers.filter((member: Member) =>
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.includes(searchTerm)
  ) : [];

  const openMemberDetails = (member: Member) => {
    setSelectedMember(member);
    setShowMemberDetails(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Member Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage member information, subscriptions, and activity
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search members by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {members.filter((m: any) => m.subscriptionStatus === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {members.filter((m: any) => m.status === 'onhold').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {members.filter((m: any) => m.status === 'suspended').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member: Member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(member.firstName || "", member.lastName || "")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMemberStatusColor(member.status)}>
                      {member.status === 'active' && '✅ Active'}
                      {member.status === 'onhold' && '⏳ Pending'}
                      {member.status === 'suspended' && '🚫 Suspended'}
                      {member.status === 'inactive' && '📦 Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSubscriptionStatusColor(member.subscriptionStatus || 'inactive')}>
                      {member.subscriptionStatus === 'active' && '💳 Active'}
                      {member.subscriptionStatus === 'expired' && '❌ Expired'}
                      {member.subscriptionStatus === 'pending' && '⏳ Pending'}
                      {member.subscriptionStatus === 'cancelled' && '🚫 Cancelled'}
                      {['active','expired','pending','cancelled'].indexOf(member.subscriptionStatus || 'inactive') === -1 && member.subscriptionStatus || 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMemberDetails(member)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No members found matching your search.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member Details Dialog */}
      <Dialog open={showMemberDetails} onOpenChange={setShowMemberDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {selectedMember && getInitials(selectedMember.firstName || "", selectedMember.lastName || "")}
                  </span>
                </div>
                <span>{selectedMember?.firstName} {selectedMember?.lastName}</span>
              </div>
              {/* Credit Tag aligned with title, only if credit > 0 */}
              {selectedMember?.credit && selectedMember.credit > 0 && (
                <Card className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-100 to-green-50 border-green-200 shadow-none">
                  <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>
                    {selectedMember.credit} TND
                  </span>
                  <Badge variant="default" className="ml-2 px-2 py-1 rounded-full text-xs">
                    Credit Available
                  </Badge>
                </Card>
              )}
            </DialogTitle>
            <DialogDescription>
              Comprehensive member information and activity
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading member details...</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {isLoadingDetails ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading member details...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Name:</span>
                          <span className="text-sm">{selectedMember?.firstName} {selectedMember?.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Email:</span>
                          <span className="text-sm">{selectedMember?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Phone:</span>
                          <span className="text-sm">{formatPhoneNumber(selectedMember?.phone || '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Date of Birth:</span>
                          <span className="text-sm">
                            {selectedMember?.dateOfBirth ? formatDate(selectedMember.dateOfBirth) : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Member Since:</span>
                          <span className="text-sm">{formatDate(selectedMember?.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Status & Permissions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Account Status:</span>
                          <Badge className={getMemberStatusColor(selectedMember?.status)}>
                            {selectedMember?.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Subscription Status:</span>
                          {relevantSubscription ? (
                            <Badge className={getSubscriptionStatusColor(relevantSubscription.status)}>
                              {relevantSubscription.status}
                            </Badge>
                          ) : (
                            <Badge className={getSubscriptionStatusColor('inactive')}>
                              inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Admin Access:</span>
                          <span className="text-sm">{selectedMember?.is_admin ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Member Access:</span>
                          <span className="text-sm">{selectedMember?.is_member ? 'Yes' : 'No'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedMember?.memberNotes && !isLoadingDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedMember.memberNotes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="subscriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Subscription History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(mappedSubscriptions || []).length > 0 ? (
                      <div className="space-y-4">
                        {(mappedSubscriptions || []).map((subscription: Subscription) => (
                          <div key={subscription.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{subscription.plan?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {subscription.plan?.sessionsIncluded} sessions included
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={getSubscriptionStatusColor(subscription.status)}>
                                  {subscription.status}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {subscription.sessionsRemaining} sessions left
                                </p>
                                <p className="text-sm font-medium">
                                  ${subscription.plan?.price}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No subscription history found
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(memberData.payments || []).length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 text-left">Date</th>
                              <th className="px-2 py-1 text-left">Amount</th>
                              <th className="px-2 py-1 text-left">Type</th>
                              <th className="px-2 py-1 text-left">Status</th>
                              <th className="px-2 py-1 text-left">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(memberData.payments || []).map((payment: Payment) => (
                              <tr key={payment.id} className="border-b last:border-b-0">
                                <td className="px-2 py-1">{formatDate(payment.payment_date)}</td>
                                <td className="px-2 py-1 font-medium">${payment.amount}</td>
                                <td className="px-2 py-1">{payment.payment_type || '-'}</td>
                                <td className="px-2 py-1">
                                  <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                                    {payment.payment_status || 'pending'}
                                  </Badge>
                                </td>
                                <td className="px-2 py-1">{payment.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No payments found for this member
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedules" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Registered Classes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(memberData.registrations || []).length > 0 ? (
                      <div className="space-y-4">
                        {(memberData.registrations || []).map((registration: Registration) => (
                          <div key={registration.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{registration.course_id?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  with {registration.course_id?.trainer?.firstName} {registration.course_id?.trainer?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTime(registration.registration_date)} 
                                  {/* Assuming registration_date is the date of registration */}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={registration.status === 'confirmed' ? 'default' : 'secondary'}>
                                  {registration.status}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Registered: {formatDate(registration.registration_date)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No class registrations found
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Check-in History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(memberData.checkins || []).length > 0 ? (
                      <div className="space-y-4">
                        {(memberData.checkins || []).map((checkin: Checkin) => (
                          <div key={checkin.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{checkin.course_id?.name ?? 'Unknown Class'}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Check-in: {formatDateTime(checkin.checkin_time)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Class: {formatDateTime(checkin.course_id?.scheduleDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={checkin.sessionConsumed ? 'default' : 'secondary'}>
                                  {checkin.sessionConsumed ? 'Session Used' : 'Free Entry'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No check-in history found
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}