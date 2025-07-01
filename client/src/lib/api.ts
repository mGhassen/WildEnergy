// Extend the Window interface to include our custom property
declare global {
  interface Window {
    __authToken?: string;
  }
}

// Helper to get the auth token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.__authToken || localStorage.getItem('access_token');
}

// Helper to set the auth token
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  
  if (token) {
    window.__authToken = token;
    localStorage.setItem('access_token', token);
  } else {
    delete window.__authToken;
    localStorage.removeItem('access_token');
  }
}

// API client with auth headers
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Ensure the URL starts with a slash and has the /api prefix
  const apiUrl = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = apiUrl.startsWith('/api') ? apiUrl : `/api${apiUrl}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies if using them
    });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear invalid token
      setAuthToken(null);
      // Redirect to login with return URL
      const returnUrl = window.location.pathname + window.location.search;
      window.location.href = `/login?returnTo=${encodeURIComponent(returnUrl)}`;
      throw new Error('Session expired. Please log in again.');
    }
    
    // Handle other error statuses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      
      const error = new Error(errorData.message || 'Request failed');
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as unknown as T;
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth API methods
export const authApi = {
  async login(credentials: { email: string; password: string }) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token received');
      }
      
      // Store the access token
      setAuthToken(data.access_token);
      
      // Store refresh token if available
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  async getSession() {
    try {
      const response = await apiFetch('/auth/session');
      return response.user; // Return just the user object for consistency
    } catch (error) {
      console.error('Session error:', error);
      throw error;
    }
  },
  
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      setAuthToken(data.access_token);
      
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      return data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      setAuthToken(null);
      localStorage.removeItem('refresh_token');
      throw error;
    }
  },
  
  async logout() {
    try {
      // Try to call the server-side logout
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {
        // Ignore errors during logout
      });
    } finally {
      // Always clear client-side auth state
      setAuthToken(null);
      localStorage.removeItem('refresh_token');
      
      // Redirect to login page
      window.location.href = '/login';
    }
  },
};
