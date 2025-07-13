"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle } from 'lucide-react';

export default function OnHoldPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = async () => {
    if (isClient && supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-100 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Account Under Review</CardTitle>
          <CardDescription>
            Your account has been created successfully and is currently under review by our administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                Account created successfully
              </span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <div className="w-5 h-5 border-2 border-orange-300 rounded-full flex-shrink-0 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Waiting for admin approval
              </span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <div className="w-5 h-5 border-2 border-gray-200 rounded-full flex-shrink-0" />
              <span className="text-sm text-gray-400">
                Access to gym features
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
              <br />
              Our team will review your account within 24 hours. You&apos;ll receive an email notification once your account is approved and you can start using all gym features.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
            <p className="text-xs text-muted-foreground">
              Questions? Contact us at{' '}
              <a href="mailto:support@wildenergy.gym" className="text-primary hover:underline">
                support@wildenergy.gym
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}