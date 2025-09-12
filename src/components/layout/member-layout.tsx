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
  Moon
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useOnboardingStatus } from "@/hooks/useMemberOnboarding";
import Link from "next/link";
import { MemberUserSkeleton } from "@/components/member-user-skeleton";
import { Shield, User, GraduationCap } from "lucide-react";

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check onboarding status
  const { data: onboardingStatus, isLoading: isLoadingOnboarding, error: onboardingError } = useOnboardingStatus();

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

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (isAuthenticated && onboardingStatus && !isLoadingOnboarding && !pathname.startsWith("/member/onboarding")) {
      console.log("Onboarding status data:", onboardingStatus);
      
      if (onboardingStatus.success && onboardingStatus.data) {
        const { onboardingCompleted, hasPersonalInfo, termsAccepted } = onboardingStatus.data;
        
        console.log("Onboarding details:", { onboardingCompleted, hasPersonalInfo, termsAccepted });
        
        if (!onboardingCompleted) {
          if (!hasPersonalInfo) {
            console.log("Redirecting to personal info");
            router.push("/member/onboarding/personal-info");
          } else if (!termsAccepted) {
            console.log("Redirecting to terms");
            router.push("/member/onboarding/terms");
          }
        }
      }
    }
  }, [isAuthenticated, onboardingStatus, isLoadingOnboarding, pathname, router]);

  // Show loading while checking onboarding status
  if (isAuthenticated && user && isLoadingOnboarding && !pathname.startsWith("/member/onboarding")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification de votre profil...</p>
        </div>
      </div>
    );
  }

  // Don't render member layout if onboarding is not completed
  if (isAuthenticated && user && onboardingStatus && !isLoadingOnboarding && !pathname.startsWith("/member/onboarding")) {
    if (onboardingStatus.success && onboardingStatus.data) {
      const { onboardingCompleted } = onboardingStatus.data;
      if (!onboardingCompleted) {
        // Show loading while redirecting
        return (
          <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirection vers l'onboarding...</p>
            </div>
          </div>
        );
      }
    }
  }

  // Don't render the member layout for onboarding pages
  if (pathname.startsWith("/member/onboarding")) {
    return <>{children}</>;
  }
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
      description: "Overview and quick actions"
    },
    { 
      name: "Browse Classes", 
      href: "/member/classes", 
      icon: Calendar,
      description: "Find and book classes"
    },
    { 
      name: "My Subscriptions", 
      href: "/member/subscriptions", 
      icon: CreditCard,
      description: "Manage your plans"
    },
  ];

  const isActive = (href: string) => {
    if (href === "/member") {
      return pathname === "/member";
    }
    return pathname.startsWith(href);
  };

  const handleNavigationClick = () => {
    setMobileMenuOpen(false);
  };

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
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Wild Energy</h1>
                  <p className="text-xs text-muted-foreground -mt-1">Pole & Dance</p>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
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
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader className="pb-6">
                    <SheetTitle className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-lg font-bold">Wild Energy</span>
                        <p className="text-xs text-muted-foreground">Pole & Dance</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* User Profile in Mobile Menu */}
                  <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg mb-6">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user ? getInitials(user.firstName || "M", user.lastName || "") : "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {user ? `${user.firstName} ${user.lastName}` : "Member"}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">Premium</Badge>
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.name} href={item.href} onClick={handleNavigationClick}>
                          <div
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              isActive(item.href)
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <div className="flex-1">
                              <div>{item.name}</div>
                              <div className="text-xs opacity-70">{item.description}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {/* User Menu Items */}
                  <div className="mt-6 space-y-2">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </div>
                    <Link href="/member/history" onClick={handleNavigationClick}>
                      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                        <History className="w-4 h-4" />
                        <div className="flex-1">
                          <div>Class History</div>
                          <div className="text-xs opacity-70">View your past classes</div>
                        </div>
                      </div>
                    </Link>
                    <Link href="/plans" onClick={handleNavigationClick}>
                      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                        <CreditCard className="w-4 h-4" />
                        <div className="flex-1">
                          <div>Plans</div>
                          <div className="text-xs opacity-70">View available plans</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

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
                      <Link href="/member/history">
                        <History className="w-4 h-4 mr-3" />
                        Class History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/plans">
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

      {/* Mobile Navigation Bar */}
      <nav className="hidden bg-card/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex justify-around px-2 py-2">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive(item.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-center">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}