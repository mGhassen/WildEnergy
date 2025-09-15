"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useMembers } from "@/hooks/useMembers";
import { 
  Search, 
  User, 
  Calendar, 
  CreditCard, 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Filter,
  Plus,
  ArrowUpDown,
  Users,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  ChevronDown,
  Star,
  Zap,
  DollarSign,
  Link,
  Unlink
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useIsMobile } from "@/hooks/use-mobile";
import { TableSkeleton } from "@/components/skeletons";
import { getCurrentSubscriptionStatus, getActiveSubscriptions } from "@/lib/api/subscriptions";
import { GuestCountBadge } from "@/components/guest-count-badge";

// Proper types based on actual API response
interface Member {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_member: boolean;
  credit: number;
  member_notes?: string;
  member_status: string;
  account_status?: string; // Account status for error styling
  guest_count?: number; // Number of times registered as guest by admin
  // subscription_status removed - calculated dynamically from subscriptions
  user_type: string;
  accessible_portals: string[];
  groupSessions?: any[];
  subscriptions?: any[]; // Add subscriptions for dynamic status calculation
  created_at?: string;
  date_of_birth?: string;
  address?: string;
  profession?: string;
}

// Helper functions
const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

// Helper function to get account icon styling based on status
const getAccountIconConfig = (accountStatus?: string) => {
  if (!accountStatus) {
    return {
      icon: XCircle,
      className: "h-4 w-4 text-muted-foreground",
      buttonClassName: "h-6 w-6 p-0 hover:bg-muted-foreground/10",
      title: "No account linked"
    };
  }

  switch (accountStatus) {
    case 'active':
      return {
        icon: CheckCircle,
        className: "h-4 w-4 text-green-600 dark:text-green-400",
        buttonClassName: "h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900",
        title: "Account active"
      };
    case 'pending':
      return {
        icon: Clock,
        className: "h-4 w-4 text-orange-600 dark:text-orange-400",
        buttonClassName: "h-6 w-6 p-0 hover:bg-orange-100 dark:hover:bg-orange-900",
        title: "Account pending approval"
      };
    case 'suspended':
      return {
        icon: AlertTriangle,
        className: "h-4 w-4 text-red-600 dark:text-red-400",
        buttonClassName: "h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900",
        title: "Account suspended"
      };
    case 'archived':
      return {
        icon: XCircle,
        className: "h-4 w-4 text-gray-600 dark:text-gray-400",
        buttonClassName: "h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-900",
        title: "Account archived"
      };
    default:
      return {
        icon: AlertTriangle,
        className: "h-4 w-4 text-yellow-600 dark:text-yellow-400",
        buttonClassName: "h-6 w-6 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900",
        title: "Unknown account status"
      };
  }
};

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};

const getStatusConfig = (status: string) => {
  const configs = {
    active: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
      icon: '✅', 
      label: 'Active' 
    },
    archived: { 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
      icon: '⏳', 
      label: 'Pending Approval' 
    },
    pending: { 
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
      icon: '📧', 
      label: 'Pending Confirmation' 
    },
    suspended: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', 
      icon: '🚫', 
      label: 'Suspended' 
    },
    inactive: { 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', 
      icon: '⏸️', 
      label: 'Inactive' 
    }
  };
  return configs[status as keyof typeof configs] || configs.inactive;
};

const getSubscriptionConfig = (status: string) => {
  const configs = {
    active: { 
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
      icon: '💳', 
      label: 'Active' 
    },
    expired: { 
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', 
      icon: '❌', 
      label: 'Expired' 
    },
    pending: { 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
      icon: '⏳', 
      label: 'Pending' 
    },
    cancelled: { 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', 
      icon: '🚫', 
      label: 'Cancelled' 
    },
    inactive: { 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', 
      icon: '⏸️', 
      label: 'Inactive' 
    }
  };
  return configs[status as keyof typeof configs] || configs.inactive;
};

export default function MembersPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch members with related data
  const { data: members = [], isLoading, refetch } = useMembers();

  // Process and filter members with proper data handling
  const processedMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    
    const baseMembers = members.map((member: any) => ({
      ...member,
      // Ensure all required fields exist
      id: member.id || member.member_id || '',
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      member_status: member.member_status || 'inactive',
      credit: typeof member.credit === 'number' ? member.credit : 0,
      phone: member.phone || '',
      created_at: member.created_at || member.createdAt || '',
      subscriptions: member.subscriptions || []
    }));
    
    // Add dynamic subscription status calculation
    return baseMembers.map(member => ({
      ...member,
      subscription_status: getCurrentSubscriptionStatus(member.subscriptions || [])
    }));
  }, [members]);

  // Calculate statistics with proper data
  const stats = useMemo(() => {
    const total = processedMembers.length;
    const active = processedMembers.filter(m => m.member_status === 'active').length;
    const pending = processedMembers.filter(m => m.member_status === 'archived').length;
    const suspended = processedMembers.filter(m => m.member_status === 'suspended').length;
    const activeSubscriptions = processedMembers.filter(m => getCurrentSubscriptionStatus(m.subscriptions || []) === 'active').length;
    const expiredSubscriptions = processedMembers.filter(m => getCurrentSubscriptionStatus(m.subscriptions || []) === 'expired').length;
    const totalCredit = processedMembers.reduce((sum, m) => sum + (m.credit || 0), 0);

    return {
      total,
      active,
      pending,
      suspended,
      activeSubscriptions,
      expiredSubscriptions,
      totalCredit
    };
  }, [processedMembers]);

  // Filter and sort members with proper data handling
  const filteredMembers = useMemo(() => {
    return processedMembers
      .filter((member) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          member.first_name?.toLowerCase().includes(searchLower) ||
          member.last_name?.toLowerCase().includes(searchLower) ||
          (member.email?.toLowerCase().includes(searchLower) || (!member.email && 'unlinked'.includes(searchLower))) ||
          member.phone?.includes(searchTerm);
        
        const matchesStatus = statusFilter === "all" || member.member_status === statusFilter;
        const matchesSubscription = subscriptionFilter === "all" || getCurrentSubscriptionStatus(member.subscriptions || []) === subscriptionFilter;
        
        return matchesSearch && matchesStatus && matchesSubscription;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case "name":
            comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
            break;
          case "email":
            comparison = (a.email || "").localeCompare(b.email || "");
            break;
          case "status":
            comparison = (a.member_status || "").localeCompare(b.member_status || "");
            break;
          case "createdAt":
            comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            break;
          case "credit":
            comparison = (a.credit || 0) - (b.credit || 0);
            break;
          default:
            comparison = 0;
        }
        
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [processedMembers, searchTerm, statusFilter, subscriptionFilter, sortBy, sortOrder]);

  const openMemberDetails = (member: Member) => {
    router.push(`/admin/members/${member.id}`);
  };

  const openAccountDetails = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (member.account_id) {
      router.push(`/admin/accounts/${member.account_id}`);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export members');
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSubscriptionFilter("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  // Mobile Member Card Component
  const MobileMemberCard = ({ member }: { member: Member }) => {
    const memberStatus = getStatusConfig(member.member_status);
    const subscriptionStatus = getSubscriptionConfig(getCurrentSubscriptionStatus(member.subscriptions || []));
    
    return (
      <Card 
        className="mb-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => openMemberDetails(member)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {getInitials(member.first_name || "", member.last_name || "")}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{member.email || 'No email (unlinked member)'}</p>
                {member.phone && (
                  <p className="text-xs text-muted-foreground">{formatPhoneNumber(member.phone)}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!member.phone}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className={memberStatus.color}>
                {memberStatus.icon} {memberStatus.label}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subscription:</span>
              <Badge className={subscriptionStatus.color}>
                {subscriptionStatus.icon} {subscriptionStatus.label}
              </Badge>
            </div>
            {member.credit > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credit:</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(member.credit)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Guest Count:</span>
              <GuestCountBadge 
                memberId={member.id} 
                memberName={`${member.first_name} ${member.last_name}`}
                showIncrementButton={false}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Joined:</span>
              <span className="text-sm">{formatDate(member.created_at || "")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-8 h-8" />
            Member Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage {stats.total} members • {stats.active} active • {stats.activeSubscriptions} with active subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            size="sm"
            onClick={() => window.location.href = '/admin/accounts/create'}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Enhanced Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Pending Approval</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending Confirmation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-[180px]">
                  <CreditCard className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="createdAt">Join Date</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort(sortBy)}
                className="px-3"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
              {(searchTerm || statusFilter !== "all" || subscriptionFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} active ({Math.round((stats.active / stats.total) * 100)}%)
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.expiredSubscriptions} expired
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Account suspended
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credit</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalCredit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members List - Responsive */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members
                <Badge variant="secondary" className="ml-2">
                  {filteredMembers.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
                {searchTerm && ` matching "${searchTerm}"`}
                {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
                {subscriptionFilter !== 'all' && ` • Subscription: ${subscriptionFilter}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          {!isMobile && viewMode === 'table' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Member
                      {sortBy === "name" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortBy === "status" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("credit")}
                  >
                    <div className="flex items-center gap-2">
                      Credit
                      {sortBy === "credit" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Guest Count</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      Joined
                      {sortBy === "createdAt" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const memberStatus = getStatusConfig(member.member_status);
                  const subscriptionStatus = getSubscriptionConfig(getCurrentSubscriptionStatus(member.subscriptions || []));
                  
                  return (
                    <TableRow 
                      key={member.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openMemberDetails(member)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {getInitials(member.first_name || "", member.last_name || "")}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {member.first_name} {member.last_name}
                              </p>
                              {(() => {
                                const iconConfig = getAccountIconConfig(member.account_status);
                                const IconComponent = iconConfig.icon;
                                
                                return member.account_id ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => openAccountDetails(member, e)}
                                    className={iconConfig.buttonClassName}
                                    title={iconConfig.title}
                                  >
                                    <IconComponent className={iconConfig.className} />
                                  </Button>
                                ) : (
                                  <div title={iconConfig.title}>
                                    <IconComponent className={iconConfig.className} />
                                  </div>
                                );
                              })()}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email || 'No email (unlinked member)'}</p>
                            {member.phone && (
                              <p className="text-xs text-muted-foreground">{formatPhoneNumber(member.phone)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={memberStatus.color}>
                          {memberStatus.icon} {memberStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={subscriptionStatus.color}>
                          {subscriptionStatus.icon} {subscriptionStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.credit > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(member.credit)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No credit</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <GuestCountBadge 
                          memberId={member.id} 
                          memberName={`${member.first_name} ${member.last_name}`}
                          showIncrementButton={false}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(member.created_at || "")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!member.phone}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <UserX className="w-4 h-4 mr-2" />
                              Suspend Member
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No members found matching your search.</p>
                        {(searchTerm || statusFilter !== "all" || subscriptionFilter !== "all") && (
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          
          {/* Desktop Grid View */}
          {!isMobile && viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const memberStatus = getStatusConfig(member.member_status);
                const subscriptionStatus = getSubscriptionConfig(getCurrentSubscriptionStatus(member.subscriptions || []));
                
                return (
                  <Card 
                    key={member.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openMemberDetails(member)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {getInitials(member.first_name || "", member.last_name || "")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{member.email || 'No email (unlinked member)'}</p>
                            {member.phone && (
                              <p className="text-xs text-muted-foreground">{formatPhoneNumber(member.phone)}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!member.phone}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <UserX className="w-4 h-4 mr-2" />
                              Suspend Member
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge className={memberStatus.color}>
                            {memberStatus.icon} {memberStatus.label}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Subscription:</span>
                          <Badge className={subscriptionStatus.color}>
                            {subscriptionStatus.icon} {subscriptionStatus.label}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Joined:</span>
                          <span className="text-sm">{formatDate(member.created_at || "")}</span>
                        </div>
                        {member.credit > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Credit:</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(member.credit)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Guest Count:</span>
                          <GuestCountBadge 
                            memberId={member.id} 
                            memberName={`${member.first_name} ${member.last_name}`}
                            showIncrementButton={false}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No members found matching your search.</p>
                    {(searchTerm || statusFilter !== "all" || subscriptionFilter !== "all") && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Mobile Card View */}
          {isMobile && (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <MobileMemberCard key={member.id} member={member} />
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No members found matching your search.</p>
                    {(searchTerm || statusFilter !== "all" || subscriptionFilter !== "all") && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}