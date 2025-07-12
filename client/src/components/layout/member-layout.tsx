import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dumbbell, LayoutDashboard, Calendar, CreditCard, LogOut, History } from "lucide-react";
import { getInitials } from "@/lib/auth";

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Wild Energy</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
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
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card shadow-sm border-b border-border">
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
