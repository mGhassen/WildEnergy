"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  status?: string;
  role?: 'admin' | 'member';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authError: string | null; // <-- Added
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<Error | null>(null);
  const [authError, setAuthError] = useState<string | null>(null); // NEW
  const router = useRouter();

  // Fetch user session
  const fetchSession = async (token: string) => {
    try {
      console.log('Fetching session with token:', token ? 'present' : 'missing');
      
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('Session API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Session API error response:', errorData);
        
        // Handle specific status codes
        if (response.status === 403) {
          // User is onhold, suspended, or inactive
          if (errorData.status === 'onhold') {
            // Redirect to onhold page
            router.push('/auth/onhold');
            setAuthError(errorData.error || 'Account access denied');
            return null;
          }
          setAuthError(errorData.error || 'Account access denied');
          return null;
        }
        
        if (response.status === 401) {
          console.log('401 error - clearing tokens and redirecting to login');
          // Clear invalid token
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            delete window.__authToken;
          }
          setUser(null);
          router.push('/login');
          setAuthError('Your session has expired or is invalid. Please log in again.');
          return null;
        }
        
        setAuthError(errorData.error || 'Failed to fetch session');
        return null;
      }

      const data = await response.json();
      console.log('Session API success response:', data);
      
      if (data.success && data.user) {
        setUser(data.user);
        setAuthError(null); // Clear any previous errors
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Session fetch error:', error);
      setAuthError(
        error instanceof Error && error.message.includes('expired')
          ? 'Your session has expired. Please log in again.'
          : 'An unexpected authentication error occurred. Please try again.'
      );
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await fetchSession(token);
        if (!user) {
          // Session was invalid, tokens already cleared in fetchSession
          console.log('Session check failed - no user returned');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Fallback cleanup in case fetchSession didn't handle it
        localStorage.removeItem('access_token');
        if (typeof window !== 'undefined') {
          delete window.__authToken;
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Refresh the current session
  const refreshSession = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    return fetchSession(token);
  };

  const login = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      // 1. Login request
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();
      
      console.log('Login API response:', data);
      console.log('Session object:', data.session);
      
      if (!response.ok || !data.success) {
        // Handle specific status codes
        if (response.status === 403) {
          if (data.error && data.error.toLowerCase().includes('onhold')) {
            throw new Error(data.error || 'Account is pending approval');
          }
          throw new Error(data.error || 'Account access denied');
        }
        throw new Error(data.error || 'Login failed');
      }

      if (!data.session || !data.session.access_token) {
        console.log('Session structure:', JSON.stringify(data.session, null, 2));
        throw new Error('No access token received');
      }

      // 2. Store tokens
      localStorage.setItem('access_token', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }
      if (typeof window !== 'undefined') {
        window.__authToken = data.session.access_token;
      }

      // 3. Set user data from response
      if (!data.user) {
        throw new Error('Failed to load user profile');
      }
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      setUser(null);
      setLoginError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth-related data regardless of API call success
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      
      // Clear user state immediately
      setUser(null);
      
      // Redirect to login page
      router.push('/login');
    }
  };

  const value: AuthState = {
    user: user ? { ...user, role: user.isAdmin ? 'admin' : 'member' } as User & { role: 'admin' | 'member' } : null,
    isLoading,
    isAuthenticated: !!user,
    isLoggingIn,
    loginError,
    login,
    logout,
    refreshSession,
    authError, // <-- Added
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}