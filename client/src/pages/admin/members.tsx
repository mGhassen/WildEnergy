import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  User, 
  Calendar, 
  CreditCard, 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/date";

// Types for member details
interface MemberDetails {
  member: any;
  subscriptions: any[];
  registrations: any[];
  checkins: any[];
  payments: any[];
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
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch members with related data
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["/api/members"],
    queryFn: () => apiRequest("GET", "/api/members"),
  });

  // Map members from snake_case to camelCase for UI
  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || '',
        lastName: m.lastName || m.last_name || '',
        email: m.email,
        status: m.status,
        subscriptionStatus: m.subscriptionStatus || m.subscription_status || 'inactive',
        phone: m.phone,
        dateOfBirth: m.dateOfBirth || m.date_of_birth,
        createdAt: m.createdAt || m.created_at,
      }))
    : [];

  // Fetch member details when selected
  const { data: memberDetails, isLoading: isLoadingDetails } = useQuery<MemberDetails>({
    queryKey: ["/api/members", selectedMember?.id, "details"],
    queryFn: () => apiRequest("GET", `/api/members/${selectedMember?.id}/details`),
    enabled: !!selectedMember?.id,
  });

  // Type assertion to help TypeScript understand the structure
  const details = memberDetails as MemberDetails | undefined;

  // Helper function to safely get member details
  const getMemberDetails = () => {
    if (!details) return { subscriptions: [], payments: [], registrations: [], checkins: [] };
    return {
      subscriptions: details.subscriptions || [],
      payments: details.payments || [],
      registrations: details.registrations || [],
      checkins: details.checkins || []
    };
  };

  const memberData = getMemberDetails();

  // Map subscriptions to camelCase fields for status logic
  const mappedSubscriptions = (memberData.subscriptions || []).map((sub: any) => ({
    ...sub,
    startDate: sub.startDate || sub.start_date,
    endDate: sub.endDate || sub.end_date,
    sessionsRemaining: sub.sessionsRemaining ?? sub.sessions_remaining,
    status: sub.status,
    plan: sub.plan ? {
      ...sub.plan,
      sessionsIncluded: sub.plan.sessionsIncluded ?? sub.plan.max_sessions,
      price: sub.plan.price,
      name: sub.plan.name,
    } : undefined,
  }));

  // Helper function to get actual subscription status from subscription data
  const getActualSubscriptionStatus = (subscriptions: any[]) => {
    if (!subscriptions || subscriptions.length === 0) return 'inactive';
    
    // Check for active subscriptions
    const activeSubscription = subscriptions.find(sub => 
      sub.status === 'active' && 
      new Date(sub.endDate) > new Date() && 
      sub.sessionsRemaining > 0
    );
    
    if (activeSubscription) return 'active';
    
    // Check for expired subscriptions
    const expiredSubscription = subscriptions.find(sub => 
      sub.status === 'active' && 
      new Date(sub.endDate) <= new Date()
    );
    
    if (expiredSubscription) return 'expired';
    
    // Check for pending subscriptions
    const pendingSubscription = subscriptions.find(sub => sub.status === 'pending');
    if (pendingSubscription) return 'pending';
    
    return 'inactive';
  };

  // Helper to get the most relevant subscription (active, or most recent)
  const getRelevantSubscription = (subscriptions: any[]) => {
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
  const getRelevantSubscriptionForMember = (subscriptions: any[]) => {
    if (!subscriptions || subscriptions.length === 0) return null;
    const mapped = (subscriptions || []).map((sub: any) => ({
      ...sub,
      startDate: sub.startDate || sub.start_date,
      endDate: sub.endDate || sub.end_date,
      sessionsRemaining: sub.sessionsRemaining ?? sub.sessions_remaining,
      status: sub.status,
    }));
    const active = mapped.find(sub => sub.status === 'active' && new Date(sub.endDate) > new Date() && sub.sessionsRemaining > 0);
    if (active) return active;
    return mapped.slice().sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    })[0];
  };

  // Filter members
  const filteredMembers = Array.isArray(mappedMembers) ? mappedMembers.filter((member: any) =>
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.includes(searchTerm)
  ) : [];

  const openMemberDetails = (member: any) => {
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
              {filteredMembers.map((member: any) => (
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
                    <Badge className={getSubscriptionStatusColor(member.current_subscription_status)}>
                      {member.current_subscription_status === 'active' && '💳 Active'}
                      {member.current_subscription_status === 'expired' && '❌ Expired'}
                      {member.current_subscription_status === 'pending' && '⏳ Pending'}
                      {member.current_subscription_status === 'cancelled' && '🚫 Cancelled'}
                      {['active','expired','pending','cancelled'].indexOf(member.current_subscription_status) === -1 && member.current_subscription_status}
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
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {selectedMember && getInitials(selectedMember.firstName || "", selectedMember.lastName || "")}
                </span>
              </div>
              <span>{selectedMember?.firstName} {selectedMember?.lastName}</span>
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
                          <span className="text-sm">{selectedMember?.isAdmin ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Member Access:</span>
                          <span className="text-sm">{selectedMember?.isMember ? 'Yes' : 'No'}</span>
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
                        {(mappedSubscriptions || []).map((subscription: any) => (
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
                            {(memberData.payments || []).map((payment: any) => (
                              <tr key={payment.id} className="border-b last:border-b-0">
                                <td className="px-2 py-1">{formatDate(payment.payment_date)}</td>
                                <td className="px-2 py-1 font-medium">${payment.amount}</td>
                                <td className="px-2 py-1">{payment.payment_type || '-'}</td>
                                <td className="px-2 py-1">
                                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                    {payment.status || 'pending'}
                                  </Badge>
                                </td>
                                <td className="px-2 py-1">{payment.payment_notes || '-'}</td>
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
                        {(memberData.registrations || []).map((registration: any) => (
                          <div key={registration.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{registration.schedule?.class?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  with {registration.schedule?.trainer?.firstName} {registration.schedule?.trainer?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTime(registration.schedule?.scheduleDate)} 
                                  {registration.schedule?.startTime} - {registration.schedule?.endTime}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={registration.status === 'confirmed' ? 'default' : 'secondary'}>
                                  {registration.status}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Registered: {formatDate(registration.registrationDate)}
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
                        {(memberData.checkins || []).map((checkin: any) => (
                          <div key={checkin.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{checkin.registration?.schedule?.class?.name ?? 'Unknown Class'}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Check-in: {formatDateTime(checkin.checkinTime)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Class: {formatDateTime(checkin.registration?.schedule?.scheduleDate)}
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