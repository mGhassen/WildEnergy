"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import {
  Dumbbell, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Tags,
  Calendar, 
  Clock, 
  Package, 
  CreditCard, 
  QrCode, 
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Home
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AdminLayoutProps {
  children: React.ReactNode;
}

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  
  console.log('Sidebar state:', state, 'Collapsed:', collapsed);
  
  return (
    <div className={`absolute bottom-20 z-50 hidden md:block ${collapsed ? 'left-0' : 'left-[var(--sidebar-width)] -translate-x-1/2'}`}>
      <Button 
        onClick={toggleSidebar}
        className="h-6 w-6 p-0 hover:bg-sidebar-accent rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to access this page.</p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has admin access
  if (!user.isAdmin && !user.accessiblePortals?.includes('admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access the admin panel.</p>
          <Button onClick={() => window.location.href = '/member'}>
            Go to Member Portal
          </Button>
        </div>
      </div>
    );
  }

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Map path segments to readable labels
    const pathLabels: Record<string, string> = {
      'admin': 'Dashboard',
      'users': 'Users',
      'members': 'Members',
      'trainers': 'Trainers',
      'classes': 'Classes',
      'schedules': 'Schedules',
      'courses': 'Courses',
      'registrations': 'Registrations',
      'checkins': 'Check-ins',
      'plans': 'Plans',
      'subscriptions': 'Subscriptions',
      'payments': 'Payments',
      'categories': 'Categories',
      'settings': 'Settings',
    };

    // Build breadcrumb trail
    let currentPath = '/admin';
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label,
        href: i === segments.length - 1 ? undefined : currentPath // Last item is not clickable
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  

  const navigation = [
    { 
      name: "Dashboard", 
      href: "/admin", 
      icon: LayoutDashboard,
      items: []
    },
    { 
      name: "People", 
      href: "/admin/members", 
      icon: Users,
      items: [
        { name: "Users", href: "/admin/users" },
        { name: "Members", href: "/admin/members" },
        { name: "Trainers", href: "/admin/trainers" },
      ]
    },
    { 
      name: "Program", 
      href: "/admin/classes", 
      icon: Calendar,
      items: [
        { name: "Classes", href: "/admin/classes" },
        { name: "Schedules", href: "/admin/schedules" },
        { name: "Courses", href: "/admin/courses" },
      ]
    },
    { 
      name: "Attendance", 
      href: "/admin/registrations", 
      icon: Clock,
      items: [
        { name: "Registrations", href: "/admin/registrations" },
        { name: "Check-ins", href: "/admin/checkins" },
      ]
    },
    { 
      name: "Payments", 
      href: "/admin/payments", 
      icon: CreditCard,
      items: [
        { name: "Plans", href: "/admin/plans" },
        { name: "Subscriptions", href: "/admin/subscriptions" },
        { name: "Payments", href: "/admin/payments" },
      ]
    },
    { 
      name: "Settings", 
      href: "/admin/settings", 
      icon: Tags,
      items: [
        { name: "Categories", href: "/admin/categories" },
      ]
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  // Function to check if any sub-item is active
  const hasActiveSubItem = (subItems?: { name: string; href: string }[]) => {
    if (!subItems) return false
    return subItems.some(subItem => isActive(subItem.href))
  }

  // Function to determine if a group should be open by default
  const shouldGroupBeOpen = (item: { href: string; items?: { name: string; href: string }[] }) => {
    return isActive(item.href) || hasActiveSubItem(item.items)
  }

  const handleNavigationClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar className="hidden md:flex" />

        {/* Main content */}
        <SidebarInset className="flex-1 flex flex-col relative border border-border shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
            <div className="flex items-center w-full">
              {/* Mobile logo and title */}
              <Link href="/admin" className="md:hidden flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">WildEnergy Admin</h1>
                  <p className="text-xs text-muted-foreground">Management Portal</p>
                </div>
              </Link>

              {/* Desktop breadcrumb */}
              <div className="hidden md:flex items-center">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/admin" className="flex items-center">
                        <Home className="w-4 h-4" />
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {breadcrumb.href ? (
                            <BreadcrumbLink href={breadcrumb.href}>
                              {breadcrumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Spacer to push right content */}
              <div className="flex-1" />

              {/* Desktop theme toggle */}
              <div className="hidden md:flex items-center space-x-4 ml-auto">
                {/* Theme toggle */}
                <ToggleGroup type="single" value={theme} onValueChange={(value) => value && setTheme(value as "light" | "dark")}>
                  <ToggleGroupItem value="light" size="sm" className="px-3">
                    <Sun className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" size="sm" className="px-3">
                    <Moon className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Mobile menu button (right side on mobile only) */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden ml-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                  <SheetHeader className="p-6 border-b border-border">
                    <SheetTitle className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">WildEnergy Admin</span>
                        <p className="text-sm text-muted-foreground">Management Portal</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = isActive(item.href);
                      const hasActiveChild = hasActiveSubItem(item.items);
                      const isGroupOpen = shouldGroupBeOpen(item);
                      
                      return (
                        <Collapsible key={item.name} defaultOpen={isGroupOpen}>
                          <div className="space-y-1">
                            <CollapsibleTrigger asChild>
                              <div
                                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <Icon className="w-5 h-5" />
                                <span className="flex-1">{item.name}</span>
                                {item.items && item.items.length > 0 && (
                                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            
                            {item.items && item.items.length > 0 && (
                              <CollapsibleContent className="space-y-1">
                                {item.items.map((subItem) => {
                                  const isSubItemActive = isActive(subItem.href);
                                  return (
                                    <Link key={subItem.name} href={subItem.href} onClick={handleNavigationClick}>
                                      <div
                                        className={`flex items-center space-x-3 px-3 py-2 ml-6 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                          isSubItemActive
                                            ? "bg-primary text-primary-foreground font-semibold"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        }`}
                                      >
                                        <span>{subItem.name}</span>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </CollapsibleContent>
                            )}
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
        
        {/* Small circular collapse button positioned on the RIGHT border, higher than bottom */}
        <SidebarCollapseButton />
      </div>
    </SidebarProvider>
  );
}
