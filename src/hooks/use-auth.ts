"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, RegisterData, LoginCredentials, AuthResponse } from '@/lib/api/auth';

export interface User {
  id: string;
  account_id: string;
  email: string; // Account email for authentication
  profileEmail?: string; // Contact email, separate from account email
  firstName?: string;
  lastName?: string;
  phone?: string;
  age?: number;
  profession?: string;
  address?: string;
  isAdmin: boolean;
  status?: string;
  role?: 'admin' | 'member';
  credit?: number;
  userType?: string;
  accessiblePortals?: string[];
  member_id?: string;
  trainer_id?: string;
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
  authError: string | null;
  // Additional auth operations
  register: (data: RegisterData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  checkAccountStatus: (email: string) => Promise<any>;
  resendConfirmation: (email: string) => Promise<void>;
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

  // Debug user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  // Fetch user session
  const fetchSession = async (token: string) => {
    console.log('=== FETCH SESSION CALLED ===');
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
          // User is pending, suspended, or other restricted status
          if (errorData.status === 'pending') {
            // Redirect to waiting approval page
            router.push('/auth/waiting-approval');
            setAuthError(errorData.error || 'Account pending approval');
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
          router.push('/auth/login');
          setAuthError('Your session has expired or is invalid. Please log in again.');
          return null;
        }
        
        setAuthError(errorData.error || 'Failed to fetch session');
        return null;
      }

      const data = await response.json();
      console.log('Session API success response:', data);
      
      if (data.success && data.user) {
        console.log('Setting user data:', data.user);
        setUser(data.user);
        setAuthError(null); // Clear any previous errors
        return data.user;
      }
      console.log('No user data in response or success is false');
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

      // Ensure window token is synchronized
      if (typeof window !== 'undefined' && !window.__authToken) {
        window.__authToken = token;
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
  }, []); // Remove router dependency to prevent re-running on navigation

  // Handle redirection when user changes (only on initial load)
  useEffect(() => {
    if (user && !isLoading) {
      const currentPath = window.location.pathname;
      
      // Only redirect if we're on the root page or login page
      if (currentPath === '/' || currentPath === '/auth/login') {
        // Check accessible portals to determine where to redirect
        if (user.accessiblePortals?.includes('admin')) {
          router.push('/admin/dashboard');
        } else if (user.accessiblePortals?.includes('member')) {
          router.push('/member');
        } else if (user.accessiblePortals?.includes('trainer')) {
          router.push('/member'); // Trainers can also access member portal
        } else {
          router.push('/auth/waiting-approval');
        }
      }
    }
  }, [user, isLoading]); // Remove router dependency

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
      const data = await authApi.login({ email, password });
      
      console.log('Login API response:', data);
      console.log('Session object:', data.session);
      
      if (!data.success) {
        // Handle specific error cases
        if (data.error === 'Email not confirmed' && data.redirectTo) {
          // Email not confirmed - redirect to account status page
          localStorage.setItem('account_status_email', email);
          router.push(data.redirectTo);
          return;
        }
        if (data.error && data.error.toLowerCase().includes('pending')) {
          // User is pending (pending admin approval)
          localStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return;
        }
        if (data.error && data.error.toLowerCase().includes('suspended')) {
          // User is suspended
          localStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return;
        }
        setLoginError(new Error(data.error || 'Account access denied'));
        return;
      }

      if (!data.session || !data.session.access_token) {
        console.log('Session structure:', JSON.stringify(data.session, null, 2));
        const error = new Error('No access token received');
        setLoginError(error);
        return;
      }

      // 2. Store tokens
      localStorage.setItem('access_token', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }
      if (typeof window !== 'undefined') {
        window.__authToken = data.session.access_token;
      }

      // Clean up any pending email
      localStorage.removeItem('pending_email');
      localStorage.removeItem('pending_approval_email');
      localStorage.removeItem('account_status_email');

      // 3. Set user data from response
      if (!data.user) {
        const error = new Error('Failed to load user profile');
        setLoginError(error);
        return;
      }
      setUser(data.user);
      setLoginError(null); // Clear any previous errors
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if this is an error with redirect information (from apiRequest)
      if (error instanceof Error && (error as any).data) {
        const errorData = (error as any).data;
        console.log('Error data:', errorData);
        
        // Handle email confirmation redirect
        if (errorData.error === 'Email not confirmed' && errorData.redirectTo) {
          localStorage.setItem('account_status_email', email);
          router.push(errorData.redirectTo);
          return; // Don't throw error, just redirect
        }
        
        // Handle other redirect cases
        if (errorData.error && errorData.error.toLowerCase().includes('pending')) {
          localStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return; // Don't throw error, just redirect
        }
        
        if (errorData.error && errorData.error.toLowerCase().includes('suspended')) {
          localStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return; // Don't throw error, just redirect
        }
      }
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      setUser(null);
      const loginError = error instanceof Error ? error : new Error(String(error));
      setLoginError(loginError);
      throw loginError; // Re-throw the error so the calling code can catch it
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
      localStorage.removeItem('pending_email');
      localStorage.removeItem('pending_approval_email');
      localStorage.removeItem('account_status_email');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      
      // Clear user state and errors immediately
      setUser(null);
      setLoginError(null);
      setAuthError(null);
      
      // Redirect to login page
      router.push('/auth/login');
    }
  };

  const value: AuthState = {
    user: user ? { 
      ...user, 
      role: user.isAdmin ? 'admin' : 'member' 
    } as User & { role: 'admin' | 'member' } : null,
    isLoading,
    isAuthenticated: !!user,
    isLoggingIn,
    loginError,
    login,
    logout,
    refreshSession,
    authError, // <-- Added
    // Additional auth operations
    register: async (data: RegisterData) => {
      try {
        await authApi.register(data);
      } catch (error: any) {
        throw new Error(error.message || 'Registration failed');
      }
    },
    forgotPassword: async (email: string) => {
      try {
        await authApi.forgotPassword(email);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to send reset email');
      }
    },
    resetPassword: async (token: string, password: string) => {
      try {
        await authApi.resetPassword(token, password);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to reset password');
      }
    },
    acceptInvitation: async (token: string, password: string) => {
      try {
        await authApi.acceptInvitation(token, password);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to accept invitation');
      }
    },
    checkAccountStatus: async (email: string) => {
      try {
        return await authApi.checkAccountStatus(email);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to check account status');
      }
    },
    resendConfirmation: async (email: string) => {
      try {
        // This might need to be added to the auth API
        const response = await fetch('/api/auth/resend-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!response.ok) {
          throw new Error('Failed to resend confirmation');
        }
      } catch (error: any) {
        throw new Error(error.message || 'Failed to resend confirmation');
      }
    },
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}