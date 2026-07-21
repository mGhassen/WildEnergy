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

function clearAuthTokens(): void {
  setAuthToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refresh_token');
  }
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const returnUrl = window.location.pathname + window.location.search;
  const loginUrl =
    returnUrl && returnUrl !== '/auth/login'
      ? `/auth/login?returnTo=${encodeURIComponent(returnUrl)}`
      : '/auth/login';
  window.location.href = loginUrl;
}

let refreshInFlight: Promise<string> | null = null;

/** Refresh access token. Coalesces concurrent calls. Throws if refresh fails. */
export async function refreshAccessToken(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot refresh token on server');
  }

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('No access token in refresh response');
    }

    setAuthToken(data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token as string;
  })();

  try {
    return await refreshInFlight;
  } catch (error) {
    clearAuthTokens();
    throw error;
  } finally {
    refreshInFlight = null;
  }
}

// API client with auth headers
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
  isRetry = false,
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
      credentials: 'include',
    });
    
    if (response.status === 401) {
      if (!isRetry) {
        try {
          await refreshAccessToken();
          return apiFetch<T>(url, options, true);
        } catch {
          // refresh failed — fall through to logout
        }
      }
      clearAuthTokens();
      redirectToLogin();
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
      // Pass through all error data properties
      Object.keys(errorData).forEach(key => {
        (error as any)[key] = errorData[key];
      });
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
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || 'Login failed');
      (error as any).status = response.status;
      throw error;
    }
    
    if (data.success && data.session?.access_token) {
      localStorage.setItem('access_token', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }
      window.__authToken = data.session.access_token;
    }
    
    return data;
  },
  
  async getSession() {
    // Get the stored token
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh the token if we get a 401
          await authApi.refreshToken();
          const newToken = getAuthToken();
          if (!newToken) throw new Error('Failed to refresh token');
          
          // Retry with new token
          const retryResponse = await fetch('/api/auth/session', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            throw new Error('Failed to get session after refresh');
          }
          
          return await retryResponse.json();
        }
        throw new Error(`Failed to get session: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Session check failed:', error);
      clearAuthTokens();
      throw error;
    }
  },
  
  async refreshToken() {
    const access_token = await refreshAccessToken();
    return { access_token };
  },
  
  async logout() {
    try {
      // Call server-side logout with credentials
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include', // Important for session cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth state
      setAuthToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Force a full page reload to clear any in-memory state
      window.location.href = '/auth/login';
    }
  },
};
