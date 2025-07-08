import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = `${res.status}: ${res.statusText}`;
    
    try {
      const text = await res.text();
      
      // Check if response is JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const errorData = JSON.parse(text);
          message = errorData.error || errorData.message || message;
        } catch {
          // JSON parsing failed, use original message
        }
      } else if (text.includes('<!DOCTYPE')) {
        // HTML error page returned
        message = `Server error: ${res.status} ${res.statusText}`;
      } else if (text.length > 0 && text.length < 200) {
        message = text;
      }
    } catch {
      // If text parsing fails, use the status message
    }

    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Get token using the shared utility
  const token = getAuthToken();

  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Parse JSON response
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
