import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dumbbell, AlertCircle } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, login, isLoggingIn, loginError } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  // Redirect if already logged in - use useEffect to avoid state update during render
  useEffect(() => {
    if (user) {
      setLocation(user.role === 'admin' ? '/admin' : '/member');
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(credentials);
  };

  const handleDemoLogin = (role: 'admin' | 'member') => {
    const demoCredentials = {
      admin: { username: "admin", password: "admin123" },
      member: { username: "member", password: "member123" }
    };
    setCredentials(demoCredentials[role]);
    login(demoCredentials[role]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">GymFlow</CardTitle>
          <CardDescription>Gym Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {loginError instanceof Error ? loginError.message : "Login failed"}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Demo Accounts</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoggingIn}
              className="text-sm"
            >
              Admin Demo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleDemoLogin('member')}
              disabled={isLoggingIn}
              className="text-sm"
            >
              Member Demo
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo credentials:</p>
            <p className="font-mono text-xs">Admin: admin / admin123</p>
            <p className="font-mono text-xs">Member: member / member123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
