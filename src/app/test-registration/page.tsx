"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

export default function TestRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const createTestRegistration = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await apiFetch('/test/add-registration', {
        method: 'POST'
      });

      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to create test registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Test Registration Creation</CardTitle>
          <CardDescription>
            Create a test registration with QR code REG_1752354439009_gbcgwqsfa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createTestRegistration} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Test Registration'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 