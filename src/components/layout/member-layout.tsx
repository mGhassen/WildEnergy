"use client";

import { usePathname } from 'next/navigation';
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
  User,
  Settings,
  Bell,
  ChevronDown
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
      name: "Class History", 
      href: "/member/history", 
      icon: History,
      description: "View past activities"
    },
    { 
      name: "My Subscriptions", 
      href: "/member/subscriptions", 
      icon: CreditCard,
      description: "Manage your plans"
    },
    { 
      name: "Plans", 
      href: "/plans", 
      icon: CreditCard,
      description: "View available plans"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link href="/member" className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Dumbbell className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Wild Energy</h1>
                  <p className="text-xs text-muted-foreground -mt-1">Fitness & Wellness</p>
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
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  2
                </span>
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
                        <p className="text-xs text-muted-foreground">Fitness & Wellness</p>
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
                  
                  <div className="absolute bottom-4 left-4 right-4 space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Button>
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
              <div className="hidden lg:flex items-center space-x-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-accent/50">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user ? getInitials(user.firstName || "M", user.lastName || "") : "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {user ? `${user.firstName} ${user.lastName}` : "Member"}
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
                      <p className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : "Member"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || "member@example.com"}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav className="lg:hidden bg-card/80 backdrop-blur-sm shadow-sm border-b border-border">
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
