"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('admin@wildenergy.gym');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Admin user created successfully! You can now log in.",
        });
        setPassword('');
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to create admin user',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create admin error:', error);
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Setup Admin User</CardTitle>
          <CardDescription>
            Create the admin user in Supabase Auth to enable login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wildenergy.gym"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
            />
          </div>
          <Button 
            onClick={handleCreateAdmin} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Admin User'}
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>After creating the admin user, you can:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to <a href="/login" className="text-blue-600 hover:underline">/login</a></li>
              <li>Log in with the email and password you just created</li>
              <li>Access the admin dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 