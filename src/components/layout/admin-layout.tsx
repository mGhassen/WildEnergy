"use client";

import { usePathname } from 'next/navigation';
import { useAuth } from "@/hooks/use-auth";
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
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Members", href: "/admin/members", icon: UserCheck },
    { name: "Trainers", href: "/admin/trainers", icon: UserCheck },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Classes", href: "/admin/classes", icon: Calendar },
    { name: "Schedules", href: "/admin/schedules", icon: Clock },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Plans", href: "/admin/plans", icon: Package },
    { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Check-ins", href: "/admin/checkins", icon: QrCode },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const handleNavigationClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex bg-card border-r border-border flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">Wild Energy</h1>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={sidebarCollapsed ? "w-7 h-7" : "w-5 h-5"} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
        {/* Collapse/expand button at the bottom of the sidebar */}
        <div className="p-2 border-t border-border flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-7 h-7" />
            ) : (
              <ChevronLeft className="w-7 h-7" />
            )}
          </Button>
        </div>
        {/* No user info or menu at the bottom of the sidebar */}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
          <div className="flex items-center w-full">
            {/* Mobile logo and title */}
            <Link href="/admin" className="md:hidden flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">GymFlow Admin</h1>
                <p className="text-xs text-muted-foreground">Management Portal</p>
              </div>
            </Link>

            {/* Spacer to push right content */}
            <div className="flex-1" />

            {/* Desktop theme toggle and user menu */}
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

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.firstName || user?.email || "Account"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      <span className="text-lg font-semibold">GymFlow Admin</span>
                      <p className="text-sm text-muted-foreground">Management Portal</p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 p-4 space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href} onClick={handleNavigationClick}>
                        <div
                          className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                
                {/* User info at bottom of mobile menu */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">A</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Admin User</p>
                      <p className="text-xs text-muted-foreground">Administrator</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
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
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
