import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import OnHoldPage from "@/pages/auth/onhold";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminMembers from "@/pages/admin/members";
import AdminTrainers from "@/pages/admin/trainers";
import AdminCategories from "@/pages/admin/categories";
import AdminClasses from "@/pages/admin/classes";
import AdminSchedules from "@/pages/admin/schedules";
import AdminPlans from "@/pages/admin/plans";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminCheckins from "@/pages/admin/checkins";
import MemberDashboard from "@/pages/member/dashboard";
import MemberClasses from "@/pages/member/classes";
import MemberClassesEnhanced from "@/pages/member/classes-enhanced";
import MemberHistory from "@/pages/member/history";
import MemberSubscriptions from "@/pages/member/subscriptions";
import MemberSubscriptionsEnhanced from "@/pages/member/subscriptions-enhanced";
import MobileApp from "@/pages/mobile-app";
import AdminLayout from "@/components/layout/admin-layout";
import MemberLayout from "@/components/layout/member-layout";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (requiredRole === 'admin' && !user?.isAdmin) {
    return <Redirect to="/member" />;
  }
  
  if (requiredRole === 'member' && !user?.isMember) {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check user status and redirect accordingly
  if (user?.status === 'onhold') {
    return <OnHoldPage />;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/auth/onhold" component={OnHoldPage} />
          <Route path="/" component={LoginPage} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          {/* Redirect root to appropriate dashboard */}
          <Route path="/">
            {user ? (
              <Redirect to={user.isAdmin ? '/admin' : '/member'} />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>

          {/* Admin routes */}
          <Route path="/admin">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/users">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/members">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminMembers />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/trainers">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminTrainers />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/categories">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminCategories />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/classes">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminClasses />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/schedules">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminSchedules />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/plans">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminPlans />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/subscriptions">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminSubscriptions />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/checkins">
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <AdminCheckins />
              </AdminLayout>
            </ProtectedRoute>
          </Route>

          {/* Member routes */}
          <Route path="/member">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberDashboard />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/member/classes">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberClasses />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/member/classes-enhanced">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberClassesEnhanced />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/member/history">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberHistory />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/member/subscriptions">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberSubscriptions />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/member/subscriptions-enhanced">
            <ProtectedRoute requiredRole="member">
              <MemberLayout>
                <MemberSubscriptionsEnhanced />
              </MemberLayout>
            </ProtectedRoute>
          </Route>

          {/* Mobile App */}
          <Route path="/mobile">
            <ProtectedRoute requiredRole="member">
              <MobileApp />
            </ProtectedRoute>
          </Route>


        </>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}