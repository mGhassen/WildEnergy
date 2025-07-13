"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function TestLoginPage() {
  const [email, setEmail] = useState('test@wildenergy.gym');
  const [password, setPassword] = useState('testpassword123');
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('User');
  const [result, setResult] = useState<any>(null);
  const { login, user, isLoading } = useAuth();

  const handleCreateTestUser = async () => {
    try {
      const response = await fetch('/api/create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();
      setResult({ createUser: data });
    } catch (error: any) {
      setResult({ error: error.message });
    }
  };

  const handleTestLogin = async () => {
    try {
      setResult({ loading: true });
      await login(email, password);
      setResult({ success: true, user });
    } catch (error: any) {
      setResult({ error: error.message });
    }
  };

  const handleTestUser = async () => {
    try {
      const response = await fetch('/api/test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setResult({ userTest: data });
    } catch (error: any) {
      setResult({ error: error.message });
    }
  };

  const handleTestSession = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setResult({ error: 'No token found in localStorage' });
        return;
      }

      const response = await fetch('/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResult({ sessionTest: data });
    } catch (error: any) {
      setResult({ error: error.message });
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">First Name:</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Last Name:</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleCreateTestUser}
          className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
        >
          Create Test User
        </button>
        
        <button
          onClick={handleTestLogin}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Test Login'}
        </button>
        
        <button
          onClick={handleTestUser}
          className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
        >
          Test User Auth
        </button>
        
        <button
          onClick={handleTestSession}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Test Session API
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      {user && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h3 className="font-bold mb-2">Current User:</h3>
          <pre className="text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 