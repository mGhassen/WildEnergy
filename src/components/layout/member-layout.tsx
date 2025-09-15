"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  LogOut, 
  History, 
  Menu, 
  X,
  ChevronDown,
  Sun,
  Moon,
  User
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useOnboardingStatus } from "@/hooks/useMemberOnboarding";
import { useTermsReAcceptance } from "@/hooks/useTermsReAcceptance";
import { useTerms } from "@/hooks/useTerms";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MemberUserSkeleton } from "@/components/member-user-skeleton";
import { Shield, GraduationCap } from "lucide-react";
import { MemberMobileSidebar } from "@/components/member-mobile-sidebar";

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check onboarding status
  const { data: onboardingStatus, isLoading: isLoadingOnboarding, error: onboardingError } = useOnboardingStatus();
  
  // Get current terms data
  const { data: currentTerms, isLoading: termsLoading } = useTerms();
  
  // Check if terms re-acceptance is needed
  const needsTermsReAcceptance = useTermsReAcceptance({ 
    user, 
    onboardingStatus, 
    currentTerms 
  });

  // Check if user is pending approval
  const isPendingUser = user?.status === 'pending';
  
  // Define allowed paths for pending users
  const allowedPathsForPending = [
    '/member/onboarding',
    '/member/terms/re-accept',
    '/member/plans',
    '/member/profile',
    '/member/waiting-approval'
  ];
  
  // Check if current path is allowed for pending users
  const isPathAllowedForPending = allowedPathsForPending.some(path => pathname.startsWith(path));

  // Force refetch onboarding status when component mounts to ensure fresh data
  useEffect(() => {
    if (isAuthenticated && user) {
      queryClient.invalidateQueries({ queryKey: ['/api/member/onboarding/status'] });
    }
  }, [isAuthenticated, user, queryClient]);

  // Debug logging
  useEffect(() => {
    console.log("Onboarding check:", {
      isAuthenticated,
      onboardingStatus,
      isLoadingOnboarding,
      onboardingError,
      pathname
    });
  }, [isAuthenticated, onboardingStatus, isLoadingOnboarding, onboardingError, pathname]);

  // Debug terms re-acceptance
  useEffect(() => {
    console.log("Terms re-acceptance check:", {
      isAuthenticated,
      needsTermsReAcceptance,
      termsLoading,
      onboardingStatus: onboardingStatus?.data,
      currentTerms,
      pathname,
      memberAcceptedVersionId: onboardingStatus?.data?.terms_version_id,
      currentActiveTermsId: currentTerms?.id,
      versionMismatch: onboardingStatus?.data?.terms_version_id !== currentTerms?.id
    });
  }, [isAuthenticated, needsTermsReAcceptance, termsLoading, onboardingStatus?.data, currentTerms, pathname]);

  // Handle logout function
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Combined redirect logic to prevent race conditions
  useEffect(() => {
    if (!isAuthenticated || isLoadingOnboarding || termsLoading) {
      return;
    }

    // Skip redirects if already on onboarding or terms pages
    if (pathname.startsWith("/member/onboarding") || pathname.startsWith("/member/terms/re-accept")) {
      return;
    }

    if (onboardingStatus?.success && onboardingStatus.data) {
      const { onboardingCompleted } = onboardingStatus.data;
      
      console.log("Onboarding status:", { onboardingCompleted });
      
      // First priority: Complete onboarding if not done
      if (!onboardingCompleted) {
        console.log("Onboarding not completed, redirecting to onboarding");
        router.push("/member/onboarding/personal-info");
        return; // Exit early to prevent re-acceptance check
      }

      // Second priority: Check for terms re-acceptance ONLY after onboarding is complete
      if (onboardingCompleted && needsTermsReAcceptance) {
        console.log("Terms re-acceptance needed, redirecting...");
        router.push("/member/terms/re-accept");
        return;
      }
    }

    // Third priority: Check if pending user is trying to access restricted areas
    if (isPendingUser && !isPathAllowedForPending) {
      console.log("Pending user trying to access restricted area, redirecting to waiting approval");
      router.push("/member/waiting-approval");
      return;
    }
  }, [
    isAuthenticated, 
    isLoadingOnboarding, 
    termsLoading,
    onboardingStatus?.success, 
    onboardingStatus?.data?.onboardingCompleted, 
    needsTermsReAcceptance,
    isPendingUser,
    isPathAllowedForPending,
    pathname, 
    router
  ]);

  // Portal switching logic
  const getCurrentPortal = () => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/member')) return 'member'
    return 'member'
  }

  const currentPortal = getCurrentPortal()
  const availablePortals = user?.accessiblePortals?.filter(portal => portal !== currentPortal) || []

  const handlePortalSwitch = (portal: string) => {
    if (portal === 'admin') {
      router.push('/admin')
    } else if (portal === 'member') {
      router.push('/member')
    }
  }

  const getPortalIcon = (portal: string) => {
    switch (portal) {
      case 'admin': return Shield
      case 'member': return User
      case 'trainer': return GraduationCap
      default: return User
    }
  }

  const getPortalName = (portal: string) => {
    switch (portal) {
      case 'admin': return 'Admin Portal'
      case 'member': return 'Member Portal'
      case 'trainer': return 'Trainer Portal'
      default: return 'Portal'
    }
  }

  const navigation = [
    { 
      name: "Dashboard", 
      href: "/member", 
      icon: LayoutDashboard,
      description: "Overview and quick actions",
      allowedForPending: false
    },
    { 
      name: "Courses & Schedule", 
      href: "/member/agenda", 
      icon: Calendar,
      description: "Browse courses and view your schedule",
      allowedForPending: false
    },
    { 
      name: "My Subscriptions", 
      href: "/member/subscriptions", 
      icon: CreditCard,
      description: "Manage your plans",
      allowedForPending: false
    },
    { 
      name: "Plans", 
      href: "/member/plans", 
      icon: CreditCard,
      description: "View available plans",
      allowedForPending: true
    },
  ];

  // Filter navigation based on user status
  const filteredNavigation = isPendingUser 
    ? navigation.filter(item => item.allowedForPending)
    : navigation;

  const isActive = (href: string) => {
    if (href === "/member") {
      return pathname === "/member";
    }
    if (href === "/member/agenda") {
      return pathname === "/member/agenda" || pathname.startsWith("/member/courses") || pathname === "/member/classes";
    }
    return pathname.startsWith(href);
  };

  const handleNavigationClick = () => {
    setMobileMenuOpen(false);
  };

  // Determine what to render based on conditions
  const shouldShowOnboarding = pathname.startsWith("/member/onboarding");
  const shouldShowLoading = isAuthenticated && user && (isLoadingOnboarding || termsLoading) && !shouldShowOnboarding && !pathname.startsWith("/member/terms/re-accept");
  const shouldShowOnboardingRedirect = isAuthenticated && user && onboardingStatus && !isLoadingOnboarding && !shouldShowOnboarding && !pathname.startsWith("/member/terms/re-accept") && onboardingStatus.success && onboardingStatus.data && !onboardingStatus.data.onboardingCompleted;
  const shouldShowTermsRedirect = isAuthenticated && user && onboardingStatus && !isLoadingOnboarding && !shouldShowOnboarding && !pathname.startsWith("/member/terms/re-accept") && needsTermsReAcceptance && !termsLoading;

  // Don't render the member layout for onboarding pages
  if (shouldShowOnboarding) {
    return <>{children}</>;
  }

  // Show loading while checking onboarding status and terms re-acceptance
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification de votre profil...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to onboarding
  if (shouldShowOnboardingRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirection vers l'onboarding...</p>
        </div>
      </div>
    );
  }
  
  // Show loading while redirecting to terms re-acceptance
  if (shouldShowTermsRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirection vers l'acceptation des conditions...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/member" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-all duration-200 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Wild Energy</h1>
                  <p className="text-xs text-muted-foreground -mt-1">Pole & Dance</p>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group ${
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive(item.href) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            
            {/* User Section */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle button - visible on all screens */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
                {theme === "light" ? (
                  <Moon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </Button>

              {/* Mobile menu button */}
              <MemberMobileSidebar />

              {/* Desktop user profile */}
              {isLoading ? (
                <MemberUserSkeleton />
              ) : user ? (
                <div className="hidden lg:flex items-center space-x-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-accent/50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getInitials(user.firstName || "M", user.lastName || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            {`${user.firstName} ${user.lastName}`}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">Premium</Badge>
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{`${user.firstName} ${user.lastName}`}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {availablePortals.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Switch Portal</p>
                        </div>
                        {availablePortals.map((portal) => {
                          const Icon = getPortalIcon(portal)
                          return (
                            <DropdownMenuItem
                              key={portal}
                              onClick={() => handlePortalSwitch(portal)}
                              className="flex items-center gap-2"
                            >
                              <Icon className="w-4 h-4" />
                              {getPortalName(portal)}
                            </DropdownMenuItem>
                          )
                        })}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/member/profile">
                        <User className="w-4 h-4 mr-3" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/member/history">
                        <History className="w-4 h-4 mr-3" />
                        Class History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/member/plans">
                        <CreditCard className="w-4 h-4 mr-3" />
                        Plans
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleTheme}>
                      {theme === "light" ? (
                        <>
                          <Moon className="w-4 h-4 mr-3" />
                          Dark Mode
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4 mr-3" />
                          Light Mode
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>


      {/* Main content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}