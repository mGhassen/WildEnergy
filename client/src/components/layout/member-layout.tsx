import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dumbbell, LayoutDashboard, Calendar, CreditCard, LogOut, History, Menu, X } from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const [location] = useLocation();
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
    { name: "Dashboard", href: "/member" },
    { name: "Browse Classes", href: "/member/classes" },
    { name: "Class History", href: "/member/history" },
    { name: "My Subscriptions", href: "/member/subscriptions" },
    { name: "Plans", href: "/plans" },
  ];

  const isActive = (href: string) => {
    if (href === "/member") {
      return location === "/member";
    }
    return location.startsWith(href);
  };

  const handleNavigationClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/member" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">Wild Energy</h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span>Wild Energy</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 space-y-4">
                    {navigation.map((item) => (
                      <Link key={item.name} href={item.href} onClick={handleNavigationClick}>
                        <div
                          className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          {item.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <Button
                      variant="outline"
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

              {/* Desktop user info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user ? getInitials(user.firstName || "M", user.lastName || "") : "M"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user ? `${user.firstName} ${user.lastName}` : "Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">Premium Member</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-10">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <span
                  className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive(item.href)
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
