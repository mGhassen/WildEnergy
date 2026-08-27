"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { useUpdateMemberDetails } from "@/hooks/useUpdateMemberDetails";
import { useUpdateSubscription } from "@/hooks/useSubscriptions";
import { useToast } from "@/hooks/use-toast";
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
  AlertCircle,
  Wallet,
  GraduationCap,
  QrCode,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink,
  Search,
} from "lucide-react";
import { formatDate, formatSubscriptionPeriod, isSubscriptionActiveByEndDate, subscriptionDaysRemaining, subscriptionDurationDays } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useIsMobile } from "@/hooks/use-mobile";
import { TableSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, X, Ban } from "lucide-react";
import { BlacklistRibbon } from "@/components/blacklist-ribbon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

// Types
interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileEmail?: string;
  status: string;
  accountStatus: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  profession?: string;
  memberNotes?: string;
  isBlacklisted: boolean;
  credit: number;
  userType: string;
  accessiblePortals: string[];
  createdAt?: string;
  account_id?: string;
}

interface CourseTrainer {
  id: string | number;
  specialization?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface Subscription {
  id: number;
  member_id: string;
  plan_id: number;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
  payment_method?: string;
  sessionsRemaining?: number;
  sessionsTotal?: number;
  plan?: {
    id: number;
    name: string;
    price: number;
    duration_days?: number;
    sessions_included?: number;
  };
}

interface Registration {
  id: number;
  course_id: number;
  member_id: string;
  subscription_id?: number;
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
    trainer?: CourseTrainer | null;
  };
}

interface Checkin {
  id: number;
  checkin_time: string;
  session_consumed?: boolean;
  notes?: string;
  registration_id?: number | null;
  qr_code?: string | null;
  course?: {
    id: number;
    course_date: string;
    start_time: string;
    end_time: string;
    class?: {
      id: number;
      name: string;
    };
    trainer?: CourseTrainer | null;
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
  discount?: number;
  due_date?: string;
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

const getRegistrationStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'registered':
    case 'attended':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'absent':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const formatTrainerName = (trainer?: CourseTrainer | null): string | null => {
  if (!trainer) return null;
  const name = [trainer.firstName, trainer.lastName].filter(Boolean).join(' ').trim();
  return name || trainer.specialization || null;
};

const RowMenuButton = ({ children }: { children: ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="w-4 h-4" />
        <span className="sr-only">Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default function MemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useIsMobile();
  const memberId = params.id as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [subscriptionCarouselApi, setSubscriptionCarouselApi] = useState<CarouselApi>();
  const [subscriptionSlide, setSubscriptionSlide] = useState(0);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("all");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState("all");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activitySessionFilter, setActivitySessionFilter] = useState("all");

  // Fetch member details
  const { data: memberDetails, isLoading, error } = useMemberDetails(memberId);

  // Account linking hooks
  const updateMemberMutation = useUpdateMemberDetails();
  const updateSubscriptionMutation = useUpdateSubscription();
  const { toast } = useToast();

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    profileEmail: "",
    dateOfBirth: "",
    address: "",
    profession: "",
    memberNotes: "",
    status: "",
    isBlacklisted: false,
    credit: 0,
    createdAt: "",
  });

  // Populate edit form when member data changes
  useEffect(() => {
    if (memberDetails) {
      const member = memberDetails.member;
      setEditForm({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phone: member.phone || "",
        profileEmail: member.profileEmail || "",
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : "",
        address: member.address || "",
        profession: member.profession || "",
        memberNotes: member.memberNotes || "",
        status: member.status || "active",
        isBlacklisted: Boolean(member.isBlacklisted),
        credit: member.credit || 0,
        createdAt: member.createdAt ? member.createdAt.split('T')[0] : "",
      });
    }
  }, [memberDetails]);

  useEffect(() => {
    if (!subscriptionCarouselApi) return;
    const onSelect = () => setSubscriptionSlide(subscriptionCarouselApi.selectedScrollSnap());
    onSelect();
    subscriptionCarouselApi.on('select', onSelect);
    return () => {
      subscriptionCarouselApi.off('select', onSelect);
    };
  }, [subscriptionCarouselApi]);

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
    const is403 = (error as any)?.status === 403;
    const is404 = (error as any)?.status === 404;

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
            {(error as any)?.status && (
              <p className="text-sm text-muted-foreground mb-4">
                Error Code: {(error as any).status}
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

  const member: Member = {
    id: memberDetails.member.id,
    firstName: memberDetails.member.firstName || '',
    lastName: memberDetails.member.lastName || '',
    email: memberDetails.member.email,
    profileEmail: memberDetails.member.profileEmail,
    status: memberDetails.member.status || 'active',
    accountStatus: memberDetails.member.accountStatus || 'active',
    phone: memberDetails.member.phone,
    dateOfBirth: memberDetails.member.dateOfBirth,
    address: memberDetails.member.address,
    profession: memberDetails.member.profession,
    memberNotes: memberDetails.member.memberNotes,
    isBlacklisted: Boolean(memberDetails.member.isBlacklisted),
    credit: memberDetails.member.credit,
    userType: memberDetails.member.userType || 'member',
    accessiblePortals: memberDetails.member.accessiblePortals || ['member'],
    account_id: memberDetails.member.account_id,
    createdAt: memberDetails.member.createdAt,
  };
  const subscriptions = memberDetails.subscriptions as Subscription[];
  const registrations = memberDetails.registrations as Registration[];
  const checkins = memberDetails.checkins as Checkin[];
  const payments = memberDetails.payments as Payment[];

  const subscriptionSearchQ = subscriptionSearch.trim().toLowerCase();
  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (subscriptionStatusFilter !== 'all' && sub.status !== subscriptionStatusFilter) return false;
    if (!subscriptionSearchQ) return true;
    return (
      sub.plan?.name?.toLowerCase().includes(subscriptionSearchQ) ||
      sub.notes?.toLowerCase().includes(subscriptionSearchQ) ||
      sub.payment_method?.toLowerCase().includes(subscriptionSearchQ) ||
      String(sub.id).includes(subscriptionSearchQ)
    );
  });

  const paymentSearchQ = paymentSearch.trim().toLowerCase();
  const filteredPayments = payments.filter((payment) => {
    if (paymentStatusFilter !== 'all' && payment.payment_status !== paymentStatusFilter) return false;
    if (!paymentSearchQ) return true;
    const sub = subscriptions.find((s) => s.id === payment.subscription_id);
    return (
      sub?.plan?.name?.toLowerCase().includes(paymentSearchQ) ||
      payment.payment_type?.toLowerCase().includes(paymentSearchQ) ||
      payment.transaction_id?.toLowerCase().includes(paymentSearchQ) ||
      payment.notes?.toLowerCase().includes(paymentSearchQ) ||
      String(payment.id).includes(paymentSearchQ)
    );
  });

  const scheduleSearchQ = scheduleSearch.trim().toLowerCase();
  const filteredRegistrations = registrations.filter((reg) => {
    if (scheduleStatusFilter !== 'all' && reg.status !== scheduleStatusFilter) return false;
    if (!scheduleSearchQ) return true;
    const trainer = formatTrainerName(reg.course?.trainer);
    return (
      reg.course?.class?.name?.toLowerCase().includes(scheduleSearchQ) ||
      trainer?.toLowerCase().includes(scheduleSearchQ) ||
      reg.notes?.toLowerCase().includes(scheduleSearchQ) ||
      String(reg.id).includes(scheduleSearchQ)
    );
  });

  const activitySearchQ = activitySearch.trim().toLowerCase();
  const filteredCheckins = checkins.filter((checkin) => {
    if (activitySessionFilter === 'consumed' && !checkin.session_consumed) return false;
    if (activitySessionFilter === 'not_consumed' && checkin.session_consumed) return false;
    if (!activitySearchQ) return true;
    const trainer = formatTrainerName(checkin.course?.trainer);
    return (
      checkin.course?.class?.name?.toLowerCase().includes(activitySearchQ) ||
      trainer?.toLowerCase().includes(activitySearchQ) ||
      checkin.notes?.toLowerCase().includes(activitySearchQ) ||
      String(checkin.id).includes(activitySearchQ)
    );
  });

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
    }
  };

  const handleSubscriptionStatusChange = async (subscriptionId: number, status: 'cancelled' | 'active') => {
    await updateSubscriptionMutation.mutateAsync({ subscriptionId, data: { status } });
    queryClient.invalidateQueries({ queryKey: ['member-details', memberId] });
  };

  // Prefer all currently active subscriptions; fall back to most recent if none
  const getFeaturedSubscriptions = (subscriptions: Subscription[]) => {
    if (!subscriptions || subscriptions.length === 0) return [];
    const active = subscriptions.filter(
      (sub) => sub.status === 'active' && isSubscriptionActiveByEndDate(sub.endDate)
    );
    if (active.length > 0) {
      return active.slice().sort((a, b) => {
        const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bDate - aDate;
      });
    }
    return [subscriptions.slice().sort((a, b) => {
      const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bDate - aDate;
    })[0]];
  };

  const featuredSubscriptions = getFeaturedSubscriptions(subscriptions);

  const outstandingDebit = subscriptions.reduce((sum, sub) => {
    const planPrice = Number(sub.plan?.price) || 0;
    const paid = payments
      .filter((p) => p.subscription_id === sub.id && p.payment_status === 'paid')
      .reduce((paidSum, p) => paidSum + (Number(p.amount) || 0), 0);
    return sum + Math.max(0, planPrice - paid);
  }, 0);

  const paidPayments = payments.filter((p) => p.payment_status === 'paid');
  const totalPaid = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingPaymentsTotal = payments
    .filter((p) => p.payment_status === 'pending')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const lastPayment = paidPayments
    .slice()
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
  const netPosition = (Number(member.credit) || 0) - outstandingDebit;

  const memberStatusLabel =
    member.status === 'active' ? 'Active' :
    member.status === 'archived' ? 'Pending Approval' :
    member.status === 'pending' ? 'Pending Confirmation' :
    member.status === 'suspended' ? 'Suspended' :
    member.status;

  const MemberStatusIcon =
    member.status === 'active' ? CheckCircle :
    member.status === 'suspended' ? XCircle :
    member.status === 'pending' || member.status === 'archived' ? Clock :
    AlertCircle;

  const getSubscriptionStatusLabel = (status: string) => {
    if (status === 'active') return 'Active';
    if (status === 'expired') return 'Expired';
    if (status === 'pending') return 'Pending';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  };

  const handleEditMember = () => {
    setIsEditing(true);
  };

  const handleManageCredit = () => {
    router.push(`/admin/members/${memberId}/credit`);
  };

  const handleSaveMember = async () => {
    // Validate required fields
    if (!editForm.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { credit: _credit, ...memberData } = editForm;
      await updateMemberMutation.mutateAsync({
        memberId: member.id,
        data: memberData
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update member:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (memberDetails) {
      const member = memberDetails.member;
      setEditForm({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phone: member.phone || "",
        profileEmail: member.profileEmail || "",
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : "",
        address: member.address || "",
        profession: member.profession || "",
        memberNotes: member.memberNotes || "",
        status: member.status || "active",
        isBlacklisted: Boolean(member.isBlacklisted),
        credit: member.credit || 0,
        createdAt: member.createdAt ? member.createdAt.split('T')[0] : "",
      });
    }
  };

  const handleToggleBlacklist = async () => {
    try {
      await updateMemberMutation.mutateAsync({
        memberId: member.id,
        data: { isBlacklisted: !member.isBlacklisted },
      });
    } catch (error) {
      console.error('Failed to toggle blacklist:', error);
    }
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
    router.push(`/admin/members/${memberId}/delete`);
  };


  const handleSendEmail = () => {
    if (!member.email) {
      toast({
        title: "Cannot send email",
        description: "This member is not linked to an account and has no email address.",
        variant: "destructive",
      });
      return;
    }
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
    router.push(`/admin/members/${memberId}/link`);
  };

  const handleCreateAccount = () => {
    router.push(`/admin/members/${memberId}/create-account`);
  };

  const handleCreateTrainer = () => {
    router.push(`/admin/members/${memberId}/create-trainer`);
  };

  const handleUnlinkAccount = () => {
    router.push(`/admin/members/${memberId}/unlink`);
  };



  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-primary">
                {getInitials(member.firstName || "", member.lastName || "")}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {member.firstName} {member.lastName}
                </h1>
                <Badge className={getMemberStatusColor(member.status)}>
                  <MemberStatusIcon className="w-3 h-3 mr-1" />
                  {memberStatusLabel}
                </Badge>
                {member.isBlacklisted && (
                  <BlacklistRibbon orientation="horizontal" />
                )}
              </div>
              {member.isBlacklisted && member.memberNotes?.trim() && (
                <p className="mt-1 text-xl font-semibold leading-snug text-foreground">
                  {member.memberNotes.trim()}
                </p>
              )}
              <p className="text-muted-foreground">{member.email || 'No email (unlinked member)'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateMemberMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMember}
                disabled={updateMemberMutation.isPending}
              >
                {updateMemberMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
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
                  <DropdownMenuItem onClick={handleManageCredit}>
                    <Wallet className="w-4 h-4 mr-2" />
                    Manage Credit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/admin/members/${memberId}/refund-session`)
                    }
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refund Session
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateTrainer}>
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Create Trainer
                  </DropdownMenuItem>
                  {member.account_id ? (
                    <DropdownMenuItem onClick={handleUnlinkAccount}>
                      <Unlink className="w-4 h-4 mr-2" />
                      Unlink Account
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={handleCreateAccount}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLinkAccount}>
                        <Link className="w-4 h-4 mr-2" />
                        Link Account
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSendEmail} disabled={!member.email}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCallMember} disabled={!member.phone}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Member
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleToggleBlacklist}>
                    <Ban className="w-4 h-4 mr-2" />
                    {member.isBlacklisted ? 'Remove from Blacklist' : 'Blacklist Member'}
                  </DropdownMenuItem>
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
            </>
          )}
        </div>
      </div>

      {/* Status and Credit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuredSubscriptions.length > 0 ? (
              <div className="group relative">
                <Carousel
                  setApi={setSubscriptionCarouselApi}
                  opts={{ align: 'start', loop: featuredSubscriptions.length > 1 }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-0">
                    {featuredSubscriptions.map((subscription) => (
                      <CarouselItem key={subscription.id} className="pl-0 basis-full">
                        <div
                          className="space-y-1.5 cursor-pointer"
                          onClick={() => router.push(`/admin/subscriptions/${subscription.id}`)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Subscription
                              {featuredSubscriptions.length > 1 && (
                                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/80">
                                  {subscriptionSlide + 1}/{featuredSubscriptions.length}
                                </span>
                              )}
                            </p>
                            <Badge className={getSubscriptionStatusColor(subscription.status)}>
                              <CreditCard className="w-3 h-3 mr-1" />
                              {getSubscriptionStatusLabel(subscription.status)}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {subscription.plan?.name || `Subscription #${subscription.id}`}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="truncate">
                              {formatSubscriptionPeriod(subscription.startDate, subscription.endDate)}
                            </span>
                            {subscription.plan?.price != null && (
                              <span className="font-medium tabular-nums shrink-0">
                                {formatCurrency(subscription.plan.price)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-primary font-medium">View subscription →</p>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {featuredSubscriptions.length > 1 && (
                    <>
                      <CarouselPrevious className="left-0 top-1/2 h-6 w-6 -translate-x-full -translate-y-1/2 border bg-background/95 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                      <CarouselNext className="right-0 top-1/2 h-6 w-6 translate-x-full -translate-y-1/2 border bg-background/95 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                    </>
                  )}
                </Carousel>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Subscription</p>
                  <Badge className={getSubscriptionStatusColor('inactive')}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">No subscription on file</p>
              </div>
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

        <Card
          className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleManageCredit}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Net position</p>
                <p className={`text-xl font-bold tabular-nums ${netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netPosition)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Credit</p>
                <p className="text-sm font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(member.credit)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Outstanding debit</p>
                <p className="text-sm font-semibold tabular-nums text-red-600">
                  {formatCurrency(outstandingDebit)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click to manage credit →
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('payments')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Payments Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Total paid</p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Paid / all</p>
                <p className="text-sm font-semibold tabular-nums">
                  {paidPayments.length}
                  <span className="text-muted-foreground font-normal"> / {payments.length}</span>
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className={`text-sm font-semibold tabular-nums ${pendingPaymentsTotal > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {formatCurrency(pendingPaymentsTotal)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Last payment</p>
                <p className="text-sm font-medium tabular-nums truncate">
                  {lastPayment ? formatDate(lastPayment.payment_date) : '—'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click to view payments →
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions{subscriptions.length > 0 ? ` (${subscriptions.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments{payments.length > 0 ? ` (${payments.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="schedules">
            Schedules{registrations.length > 0 ? ` (${registrations.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity{checkins.length > 0 ? ` (${checkins.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="relative overflow-hidden">
              {member.isBlacklisted && <BlacklistRibbon size="lg" />}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                {isEditing && (
                  <CardDescription>
                    Fields marked with <span className="text-destructive">*</span> are required
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="mt-1"
                        required
                      />
                    ) : (
                      <p className="text-sm">{member.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="mt-1"
                        required
                      />
                    ) : (
                      <p className="text-sm">{member.lastName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Account Email</Label>
                  {member.email ? (
                    <p className="text-sm">{member.email}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">No account linked</p>
                      <div className="flex gap-1">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={handleCreateAccount}
                          className="h-auto p-0 text-primary hover:text-primary/80"
                        >
                          Create Account
                        </Button>
                        <span className="text-muted-foreground">•</span>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={handleLinkAccount}
                          className="h-auto p-0 text-primary hover:text-primary/80"
                        >
                          Link Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contact Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.profileEmail}
                      onChange={(e) => setEditForm({ ...editForm, profileEmail: e.target.value })}
                      className="mt-1"
                      placeholder="Contact email"
                    />
                  ) : (
                    <p className="text-sm">{member.profileEmail || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{member.phone ? formatPhoneNumber(member.phone) : 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{member.dateOfBirth ? formatDate(member.dateOfBirth) : 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {member.address || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Profession</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.profession}
                      onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {member.profession || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.createdAt}
                      onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm">{formatDate(member.createdAt || "")}</p>
                  )}
                </div>

                {/* Member Status */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Status</Label>
                  {isEditing ? (
                    <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge className={getMemberStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Blacklist</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Switch
                        checked={editForm.isBlacklisted}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isBlacklisted: checked })}
                      />
                      <span className="text-sm">
                        {editForm.isBlacklisted ? 'Blacklisted' : 'Not blacklisted'}
                      </span>
                    </div>
                  </div>
                )}


                {/* Credit Balance — managed via Manage Credit dialog */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Credit Balance</Label>
                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <Input
                        type="number"
                        value={editForm.credit}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use{" "}
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={handleManageCredit}
                        >
                          Manage Credit
                        </button>{" "}
                        from the Actions menu to add or remove credit.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{formatCurrency(member.credit)}</p>
                  )}
                </div>

                {/* Member Notes */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Notes</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.memberNotes}
                      onChange={(e) => setEditForm({ ...editForm, memberNotes: e.target.value })}
                      className="mt-1"
                      rows={3}
                      placeholder="Enter member notes..."
                    />
                  ) : (
                    <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {member.memberNotes || 'No notes'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Information (Read-only) */}
            <Card>
              <CardHeader>
                {member.account_id ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/accounts/${member.account_id}`)}
                    className="text-left"
                  >
                    <CardTitle className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Settings className="w-5 h-5" />
                      Account Information
                    </CardTitle>
                  </button>
                ) : (
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Information
                  </CardTitle>
                )}
                <CardDescription>
                  Account settings can be edited in the account page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User Type</Label>
                  <p className="text-sm capitalize">{member.userType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Accessible Portals</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {member.accessiblePortals?.map((portal) => (
                      <Badge key={portal} variant="secondary" className="text-xs">
                        {portal}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Login Status</Label>
                  <div className="mt-1">
                    <Badge className={getMemberStatusColor(member.accountStatus)}>
                      {member.accountStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Subscriptions ({subscriptions.length})
                  </CardTitle>
                  <CardDescription>
                    Plans, remaining sessions, and status
                  </CardDescription>
                </div>
              </div>
              {subscriptions.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={subscriptionSearch}
                      onChange={(e) => setSubscriptionSearch(e.target.value)}
                      placeholder="Search plan, notes, method…"
                      className="pl-8"
                    />
                  </div>
                  <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subscription history found</p>
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No subscriptions match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubscriptions.map((subscription) => {
                    const daysLeft = subscriptionDaysRemaining(subscription.endDate);
                    const duration = subscription.plan?.duration_days
                      ?? subscriptionDurationDays(subscription.startDate, subscription.endDate);
                    const sessionsRemaining = subscription.sessionsRemaining ?? 0;
                    const sessionsTotal = subscription.sessionsTotal ?? 0;
                    return (
                      <div
                        key={subscription.id}
                        className="flex items-start gap-3 border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/admin/subscriptions/${subscription.id}`)}
                              className="text-left font-medium hover:text-primary transition-colors truncate"
                            >
                              {subscription.plan?.name || 'Unknown Plan'}
                            </button>
                            <Badge className={getSubscriptionStatusColor(subscription.status)}>
                              {subscription.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatSubscriptionPeriod(subscription.startDate, subscription.endDate)}
                            </span>
                            {duration > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {duration}d plan
                              </span>
                            )}
                            {subscription.status === 'active' && (
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                {daysLeft}d left
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            {subscription.plan && (
                              <span className="font-medium">{formatCurrency(subscription.plan.price)}</span>
                            )}
                            {sessionsTotal > 0 && (
                              <span className="text-muted-foreground">
                                Sessions {sessionsRemaining}/{sessionsTotal}
                              </span>
                            )}
                            {subscription.payment_method && (
                              <span className="text-muted-foreground capitalize">
                                {subscription.payment_method}
                              </span>
                            )}
                          </div>
                          {subscription.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {subscription.notes}
                            </p>
                          )}
                        </div>
                        <RowMenuButton>
                          <DropdownMenuItem
                            onSelect={() => router.push(`/admin/subscriptions/${subscription.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View subscription
                          </DropdownMenuItem>
                          {subscription.plan_id && (
                            <DropdownMenuItem
                              onSelect={() => router.push(`/admin/plans/${subscription.plan_id}`)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View plan
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => router.push(`/admin/subscriptions/${subscription.id}/edit`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(subscription.status === 'active' || subscription.status === 'pending') && (
                            <DropdownMenuItem
                              onSelect={() => handleSubscriptionStatusChange(subscription.id, 'cancelled')}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'cancelled' && (
                            <DropdownMenuItem
                              onSelect={() => handleSubscriptionStatusChange(subscription.id, 'active')}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => router.push(`/admin/subscriptions/${subscription.id}/delete`)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </RowMenuButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payments ({payments.length})
                </CardTitle>
                <CardDescription>
                  Payment history for this member
                </CardDescription>
              </div>
              {payments.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      placeholder="Search type, transaction, notes…"
                      className="pl-8"
                    />
                  </div>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history found</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payments match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => {
                    const sub = subscriptions.find((s) => s.id === payment.subscription_id);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-start gap-3 border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(payment.amount)}
                            </span>
                            <Badge className={getPaymentStatusColor(payment.payment_status)}>
                              {payment.payment_status}
                            </Badge>
                            {payment.payment_type && (
                              <Badge variant="outline" className="capitalize">
                                {payment.payment_type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(payment.payment_date)}
                            </span>
                            {payment.subscription_id ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/admin/subscriptions/${payment.subscription_id}`)}
                                className="hover:text-primary transition-colors text-left"
                              >
                                {sub?.plan?.name || `Subscription #${payment.subscription_id}`}
                              </button>
                            ) : (
                              <span>No subscription</span>
                            )}
                            {Number(payment.discount) > 0 && (
                              <span>Discount {formatCurrency(payment.discount!)}</span>
                            )}
                            {payment.due_date && (
                              <span>Due {formatDate(payment.due_date)}</span>
                            )}
                          </div>
                          {payment.transaction_id && (
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              TX: {payment.transaction_id}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                        <RowMenuButton>
                          {payment.subscription_id && (
                            <DropdownMenuItem
                              onSelect={() => router.push(`/admin/subscriptions/${payment.subscription_id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View subscription
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => router.push(`/admin/payments/${payment.id}/edit`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit payment
                          </DropdownMenuItem>
                          {payment.transaction_id && (
                            <DropdownMenuItem
                              onSelect={() => copyText(payment.transaction_id!, 'Transaction ID')}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy transaction ID
                            </DropdownMenuItem>
                          )}
                          {payment.notes && (
                            <DropdownMenuItem
                              onSelect={() =>
                                toast({
                                  title: 'Payment notes',
                                  description: payment.notes,
                                })
                              }
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View notes
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => router.push(`/admin/payments/${payment.id}/delete`)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </RowMenuButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Class Registrations ({registrations.length})
                </CardTitle>
                <CardDescription>
                  Registered courses and schedule history
                </CardDescription>
              </div>
              {registrations.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                      placeholder="Search class, trainer, notes…"
                      className="pl-8"
                    />
                  </div>
                  <Select value={scheduleStatusFilter} onValueChange={setScheduleStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="attended">Attended</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No class registrations found</p>
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No registrations match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRegistrations.map((registration) => {
                    const courseId = registration.course?.id ?? registration.course_id;
                    const trainerName = formatTrainerName(registration.course?.trainer);
                    const className = registration.course?.class?.name || `Class ID: ${registration.course_id}`;
                    return (
                      <div
                        key={registration.id}
                        className="flex items-start gap-3 border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {courseId ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/admin/courses/${courseId}`)}
                                className="text-left font-medium hover:text-primary transition-colors truncate"
                              >
                                {className}
                              </button>
                            ) : (
                              <h4 className="font-medium truncate">{className}</h4>
                            )}
                            <Badge className={getRegistrationStatusColor(registration.status)}>
                              {registration.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {registration.course?.course_date
                                ? formatDate(registration.course.course_date)
                                : formatDate(registration.registration_date)}
                            </span>
                            {registration.course?.start_time && registration.course?.end_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {registration.course.start_time} – {registration.course.end_time}
                              </span>
                            )}
                            {trainerName && (
                              <span className="inline-flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {trainerName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Registered {formatDate(registration.registration_date)}
                          </p>
                          {registration.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {registration.notes}
                            </p>
                          )}
                        </div>
                        <RowMenuButton>
                          {courseId && (
                            <DropdownMenuItem
                              onSelect={() => router.push(`/admin/courses/${courseId}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View course
                            </DropdownMenuItem>
                          )}
                          {registration.qr_code && (
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(
                                  `/admin/checkins/qr/${encodeURIComponent(registration.qr_code)}`
                                )
                              }
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              Open QR check-in
                            </DropdownMenuItem>
                          )}
                          {courseId && registration.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onSelect={() => {
                                const qs = new URLSearchParams({
                                  registrationId: String(registration.id),
                                  memberId: member.id,
                                  memberName: `${member.firstName} ${member.lastName}`.trim(),
                                });
                                if (registration.subscription_id) {
                                  qs.set('subscriptionId', String(registration.subscription_id));
                                }
                                router.push(`/admin/courses/${courseId}/cancel?${qs.toString()}`);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel registration
                            </DropdownMenuItem>
                          )}
                        </RowMenuButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Check-in History ({checkins.length})
                </CardTitle>
                <CardDescription>
                  Attendance and session consumption
                </CardDescription>
              </div>
              {checkins.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Search class, trainer, notes…"
                      className="pl-8"
                    />
                  </div>
                  <Select value={activitySessionFilter} onValueChange={setActivitySessionFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All check-ins</SelectItem>
                      <SelectItem value="consumed">Session consumed</SelectItem>
                      <SelectItem value="not_consumed">Session not consumed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No check-in history found</p>
                </div>
              ) : filteredCheckins.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No check-ins match your filters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCheckins.map((checkin) => {
                    const courseId = checkin.course?.id;
                    const trainerName = formatTrainerName(checkin.course?.trainer);
                    const className = checkin.course?.class?.name || `Check-in #${checkin.id}`;
                    const methodLabel = checkin.notes?.toLowerCase().includes('qr')
                      ? 'QR check-in'
                      : checkin.notes
                        ? 'Manual / noted'
                        : 'Check-in';
                    return (
                      <div
                        key={checkin.id}
                        className="flex items-start gap-3 border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {courseId ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/admin/courses/${courseId}`)}
                                className="text-left font-medium hover:text-primary transition-colors truncate"
                              >
                                {className}
                              </button>
                            ) : (
                              <h4 className="font-medium truncate">{className}</h4>
                            )}
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Checked In
                            </Badge>
                            {checkin.session_consumed === false && (
                              <Badge variant="outline">Session kept</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {checkin.course?.course_date
                                ? formatDate(checkin.course.course_date)
                                : formatDateTime(checkin.checkin_time)}
                            </span>
                            {checkin.course?.start_time && checkin.course?.end_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {checkin.course.start_time} – {checkin.course.end_time}
                              </span>
                            )}
                            {trainerName && (
                              <span className="inline-flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {trainerName}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Check-in: {formatDateTime(checkin.checkin_time)}</span>
                            <span>{methodLabel}</span>
                          </div>
                          {checkin.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {checkin.notes}
                            </p>
                          )}
                        </div>
                        <RowMenuButton>
                          {courseId && (
                            <DropdownMenuItem
                              onSelect={() => router.push(`/admin/courses/${courseId}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View course
                            </DropdownMenuItem>
                          )}
                          {courseId && checkin.registration_id && (
                            <DropdownMenuItem
                              onSelect={() => router.push(`/admin/courses/${courseId}`)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              View registration
                            </DropdownMenuItem>
                          )}
                          {checkin.qr_code && (
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(
                                  `/admin/checkins/qr/${encodeURIComponent(checkin.qr_code!)}`
                                )
                              }
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              Open QR page
                            </DropdownMenuItem>
                          )}
                        </RowMenuButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}