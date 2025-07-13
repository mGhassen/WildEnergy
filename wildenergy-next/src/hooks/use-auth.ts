"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';

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
  const [, setLocation] = useLocation();

  // Fetch user session
  const fetchSession = async (token: string) => {
    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific status codes
        if (response.status === 403) {
          // User is onhold, suspended, or inactive
          if (errorData.status === 'onhold') {
            // Redirect to onhold page
            setLocation('/auth/onhold');
            return null;
          }
          throw new Error(errorData.error || 'Account access denied');
        }
        
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            delete window.__authToken;
          }
          setUser(null);
          setLocation('/login');
          return null;
        }
        
        throw new Error(errorData.error || 'Failed to fetch session');
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Session fetch error:', error);
      throw error;
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
        await fetchSession(token);
      } catch (error) {
        console.error('Session check failed:', error);
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
  }, []);

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
      
      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 403) {
          // User is onhold, suspended, or inactive
          if (data.status === 'onhold') {
            // Redirect to onhold page
            setLocation('/auth/onhold');
            throw new Error(data.error || 'Account is pending approval');
          }
          throw new Error(data.error || 'Account access denied');
        }
        
        throw new Error(data.error || 'Login failed');
      }

      if (!data.access_token) {
        throw new Error('No access token received');
      }

      // 2. Store tokens
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      // Set token in window object for API utility
      if (typeof window !== 'undefined') {
        window.__authToken = data.access_token;
      }

      // 3. Get and set user data
      const userData = await fetchSession(data.access_token);
      
      if (!userData) {
        throw new Error('Failed to load user profile');
      }

      // 4. Set user state (App component will handle redirection)
      setUser(userData);
      
      // Let the App component handle redirection based on user state
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial auth state
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
      setLocation('/login');
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
    refreshSession
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}