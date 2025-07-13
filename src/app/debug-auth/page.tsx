"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthToken } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the current token
    const currentToken = getAuthToken();
    setToken(currentToken);

    // Test the session API
    if (currentToken) {
      fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        setSessionData(data);
      })
      .catch(err => {
        setError(err.message);
      });
    }
  }, []);

  const testCheckinAPI = async () => {
    try {
      const response = await fetch('/api/checkin/qr/REG_1752354439009_gbcgwqsfa', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Checkin API response:', { status: response.status, data });
      alert(`Checkin API Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('Checkin API error:', err);
      alert(`Checkin API Error: ${err}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
          <CardDescription>Current authentication state and token information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Auth State:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify({
                isLoading,
                isAuthenticated,
                user: user ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  isAdmin: user.isAdmin
                } : null
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">Token:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {token ? `${token.substring(0, 20)}...` : 'No token found'}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">Session API Response:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>

          {error && (
            <div>
              <h3 className="font-semibold text-red-600">Error:</h3>
              <pre className="bg-red-100 p-2 rounded text-sm text-red-800">
                {error}
              </pre>
            </div>
          )}

          <Button onClick={testCheckinAPI} className="w-full">
            Test Checkin API
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 