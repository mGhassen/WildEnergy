import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
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
import AdminCourses from "@/pages/admin/courses";
import AdminPlans from "@/pages/admin/plans";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminPayments from "@/pages/admin/payments";
import AdminCheckins from "@/pages/admin/checkins";
import MemberDashboard from "@/pages/member/dashboard";
import MemberClasses from "@/pages/member/classes";
import MemberHistory from "@/pages/member/history";
import MemberSubscriptions from "@/pages/member/subscriptions";
import AdminLayout from "@/components/layout/admin-layout";
import MemberLayout from "@/components/layout/member-layout";
import PlansPage from "@/pages/plans";
import MemberHome from "@/pages/member/home";

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

  if (requiredRole === 'member' && user?.isAdmin) {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check user status and redirect accordingly
  // Only show onhold page if user status is explicitly 'onhold'
  if (user && user.status === 'onhold') {
    return <OnHoldPage />;
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={!user ? LoginPage : () => <Redirect to={user?.isAdmin ? '/admin' : '/member'} />} />
      <Route path="/register" component={!user ? RegisterPage : () => <Redirect to={user?.isAdmin ? '/admin' : '/member'} />} />
      <Route path="/auth/onhold" component={OnHoldPage} />
      <Route path="/plans" component={PlansPage} />

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

      <Route path="/admin/courses">
        <ProtectedRoute requiredRole="admin">
          <AdminLayout>
            <AdminCourses />
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

      <Route path="/admin/payments">
        <ProtectedRoute requiredRole="admin">
          <AdminLayout>
            <AdminPayments />
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
      <Route path="/member/home">
        <ProtectedRoute requiredRole="member">
          <MemberLayout>
            <MemberHome />
          </MemberLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/member/dashboard">
        <Redirect to="/member/home" />
      </Route>
      <Route path="/member/subscriptions">
        <ProtectedRoute requiredRole="member">
          <MemberLayout>
            <MemberSubscriptions />
          </MemberLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/member">
        <ProtectedRoute requiredRole="member">
          <MemberLayout>
            <MemberHome />
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

      {/* Root route - redirect based on auth status */}
      <Route path="/">
        {user ? (
          <Redirect to={user?.isAdmin ? '/admin' : '/member'} />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      {/* 404 - Not Found */}
      <Route path="*">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-gray-600 mb-8">Page not found</p>
            <a href="/" className="text-primary hover:underline">
              Go back home
            </a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster />
          <SonnerToaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}