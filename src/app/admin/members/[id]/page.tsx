"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { useUnlinkAccount } from "@/hooks/useAccountLinking";
import { AccountLinkingDialog } from "@/components/account-linking-dialog";
import { 
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Send,
  User,
  MapPin,
  Briefcase,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Settings,
  Link,
  Unlink,
  UserPlus,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useIsMobile } from "@/hooks/use-mobile";
import { TableSkeleton } from "@/components/skeletons";

// Types
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  accountStatus: string;
  subscriptionStatus: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  profession?: string;
  memberNotes?: string;
  credit: number;
  userType: string;
  accessiblePortals: string[];
  createdAt?: string;
}

interface Subscription {
  id: number;
  member_id: string;
  plan_id: number;
  startDate: string;
  endDate: string;
  status: string;
  plan?: {
    id: number;
    name: string;
    price: number;
  };
}

interface Registration {
  id: number;
  course_id: number;
  member_id: string;
  status: string;
  registration_date: string;
  qr_code: string;
  notes?: string;
  course?: {
    id: number;
    course_date: string;
    start_time: string;
    end_time: string;
    class?: {
      id: number;
      name: string;
    };
  };
}

interface Checkin {
  id: number;
  checkin_time: string;
  course?: {
    id: number;
    course_date: string;
    start_time: string;
    end_time: string;
    class?: {
      id: number;
      name: string;
    };
  };
}

interface Payment {
  id: number;
  subscription_id: number;
  member_id: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  payment_date: string;
  transaction_id?: string;
  notes?: string;
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
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getMemberStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'archived': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export default function MemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useIsMobile();
  const memberId = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Fetch member details
  const { data: memberDetails, isLoading, error } = useMemberDetails(memberId);
  
  // Account linking hooks
  const unlinkAccountMutation = useUnlinkAccount();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (error || !memberDetails) {
    const errorMessage = error?.message || 'Unknown error occurred';
    const is403 = error?.status === 403;
    const is404 = error?.status === 404;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {is403 ? 'Access Denied' : is404 ? 'Member Not Found' : 'Error Loading Member'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {is403 
                ? 'You don\'t have permission to view this member\'s details.'
                : is404
                ? `The member with ID "${memberId}" doesn't exist.`
                : `Failed to load member details: ${errorMessage}`
              }
            </p>
            {error?.status && (
              <p className="text-sm text-muted-foreground mb-4">
                Error Code: {error.status}
              </p>
            )}
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const member = memberDetails.member as Member;
  const subscriptions = memberDetails.subscriptions as Subscription[];
  const registrations = memberDetails.registrations as Registration[];
  const checkins = memberDetails.checkins as Checkin[];
  const payments = memberDetails.payments as Payment[];

  // Get the most relevant subscription
  const getRelevantSubscription = (subscriptions: Subscription[]) => {
    if (!subscriptions || subscriptions.length === 0) return null;
    const active = subscriptions.find(sub => sub.status === 'active' && new Date(sub.endDate) > new Date());
    if (active) return active;
    return subscriptions.slice().sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    })[0];
  };

  const relevantSubscription = getRelevantSubscription(subscriptions);

  const handleEditMember = () => {
    // TODO: Implement edit member functionality
    console.log('Edit member:', member.id);
  };

  const handleSuspendMember = () => {
    // TODO: Implement suspend member functionality
    console.log('Suspend member:', member.id);
  };

  const handleActivateMember = () => {
    // TODO: Implement activate member functionality
    console.log('Activate member:', member.id);
  };

  const handleDeleteMember = () => {
    // TODO: Implement delete member functionality
    console.log('Delete member:', member.id);
  };

  const handleSendEmail = () => {
    // TODO: Implement send email functionality
    console.log('Send email to:', member.email);
  };

  const handleCallMember = () => {
    // TODO: Implement call member functionality
    console.log('Call member:', member.phone);
  };

  const handleExportData = () => {
    // TODO: Implement export member data functionality
    console.log('Export data for member:', member.id);
  };

  const handleLinkAccount = () => {
    setShowLinkDialog(true);
  };

  const handleUnlinkAccount = async () => {
    if (!confirm('Are you sure you want to unlink this account from the member?')) {
      return;
    }

    try {
      await unlinkAccountMutation.mutateAsync(memberId);
    } catch (error) {
      console.error('Failed to unlink account:', error);
    }
  };

  const handleLinkSuccess = () => {
    // The query will automatically refetch due to invalidation
    setShowLinkDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-primary">
                {getInitials(member.firstName || "", member.lastName || "")}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-muted-foreground">{member.email}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleEditMember}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Member
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.account_id ? (
                <DropdownMenuItem onClick={handleUnlinkAccount} disabled={unlinkAccountMutation.isPending}>
                  <Unlink className="w-4 h-4 mr-2" />
                  {unlinkAccountMutation.isPending ? 'Unlinking...' : 'Unlink Account'}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleLinkAccount}>
                  <Link className="w-4 h-4 mr-2" />
                  Link Account
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCallMember} disabled={!member.phone}>
                <Phone className="w-4 h-4 mr-2" />
                Call Member
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.status === 'active' ? (
                <DropdownMenuItem onClick={handleSuspendMember} className="text-destructive">
                  <UserX className="w-4 h-4 mr-2" />
                  Suspend Member
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivateMember}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Activate Member
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDeleteMember} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status and Credit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getMemberStatusColor(member.status)}>
              {member.status === 'active' && '✅ Active'}
              {member.status === 'archived' && '⏳ Pending Approval'}
              {member.status === 'pending' && '📧 Pending Confirmation'}
              {member.status === 'suspended' && '🚫 Suspended'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            {relevantSubscription ? (
              <Badge className={getSubscriptionStatusColor(relevantSubscription.status)}>
                {relevantSubscription.status === 'active' && '💳 Active'}
                {relevantSubscription.status === 'expired' && '❌ Expired'}
                {relevantSubscription.status === 'pending' && '⏳ Pending'}
                {relevantSubscription.status === 'cancelled' && '🚫 Cancelled'}
                {!['active', 'expired', 'pending', 'cancelled'].includes(relevantSubscription.status) && relevantSubscription.status}
              </Badge>
            ) : (
              <Badge className={getSubscriptionStatusColor('inactive')}>
                Inactive
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`border-l-4 ${member.account_id ? 'border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow' : 'border-l-orange-500'}`}
          onClick={member.account_id ? () => router.push(`/admin/accounts/${member.account_id}`) : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Linking</CardTitle>
          </CardHeader>
          <CardContent>
            {member.account_id ? (
              <div className="space-y-2">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <Link className="w-3 h-3 mr-1" />
                  Linked
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Account ID: {member.account_id}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Click to view account details →
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Linked
                </Badge>
                <p className="text-xs text-muted-foreground">
                  No account linked
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {member.credit > 0 && (
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(member.credit)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-sm">{member.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-sm">{member.lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{member.email}</p>
                </div>
                {member.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{formatPhoneNumber(member.phone)}</p>
                  </div>
                )}
                {member.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">{formatDate(member.dateOfBirth)}</p>
                  </div>
                )}
                {member.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {member.address}
                    </p>
                  </div>
                )}
                {member.profession && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Profession</label>
                    <p className="text-sm flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {member.profession}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <p className="text-sm">{formatDate(member.createdAt || "")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Type</label>
                  <p className="text-sm capitalize">{member.userType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Accessible Portals</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {member.accessiblePortals?.map((portal) => (
                      <Badge key={portal} variant="secondary" className="text-xs">
                        {portal}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                  <div className="mt-1">
                    <Badge className={getMemberStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                </div>
                {member.memberNotes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {member.memberNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription History
              </CardTitle>
              <CardDescription>
                All subscription plans and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length > 0 ? (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium">{subscription.plan?.name || 'Unknown Plan'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                          </p>
                          {subscription.plan && (
                            <p className="text-sm text-muted-foreground">
                              Price: {formatCurrency(subscription.plan.price)}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <Badge className={getSubscriptionStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                          {subscription.plan && (
                            <p className="text-sm font-medium">
                              {formatCurrency(subscription.plan.price)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subscription history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                All payments made by this member
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Amount</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Transaction ID</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b last:border-b-0">
                          <td className="py-2">{formatDate(payment.payment_date)}</td>
                          <td className="py-2 font-medium">{formatCurrency(payment.amount)}</td>
                          <td className="py-2">{payment.payment_type || '-'}</td>
                          <td className="py-2">
                            <Badge className={getPaymentStatusColor(payment.payment_status)}>
                              {payment.payment_status}
                            </Badge>
                          </td>
                          <td className="py-2 font-mono text-xs">{payment.transaction_id || '-'}</td>
                          <td className="py-2">{payment.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Class Registrations
              </CardTitle>
              <CardDescription>
                All class registrations and schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registrations.length > 0 ? (
                <div className="space-y-4">
                  {registrations.map((registration) => (
                    <div key={registration.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium">
                            {registration.course?.class?.name || `Class ID: ${registration.course_id}`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {registration.course?.course_date ? 
                              formatDate(registration.course.course_date) : 
                              formatDate(registration.registration_date)
                            }
                          </p>
                          {registration.course?.start_time && registration.course?.end_time && (
                            <p className="text-sm text-muted-foreground">
                              {registration.course.start_time} - {registration.course.end_time}
                            </p>
                          )}
                          {registration.notes && (
                            <p className="text-sm text-muted-foreground">
                              Notes: {registration.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <Badge variant={registration.status === 'confirmed' ? 'default' : 'secondary'}>
                            {registration.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            QR: {registration.qr_code?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No class registrations found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Check-in History
              </CardTitle>
              <CardDescription>
                All check-ins and activity history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkins.length > 0 ? (
                <div className="space-y-4">
                  {checkins.map((checkin) => (
                    <div key={checkin.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium">
                            {checkin.course?.class?.name || `Check-in #${checkin.id}`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {checkin.course?.course_date ? 
                              formatDate(checkin.course.course_date) : 
                              formatDateTime(checkin.checkin_time)
                            }
                          </p>
                          {checkin.course?.start_time && checkin.course?.end_time && (
                            <p className="text-sm text-muted-foreground">
                              {checkin.course.start_time} - {checkin.course.end_time}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Check-in: {formatDateTime(checkin.checkin_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Checked In
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No check-in history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Linking Dialog */}
      <AccountLinkingDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        memberId={memberId}
        memberName={`${member.firstName} ${member.lastName}`}
        onSuccess={handleLinkSuccess}
      />
    </div>
  );
}
