export const LOGIN_RETURN_STORAGE_KEY = 'login_return_path';

/**
 * Accepts internal app paths only (prevents open redirects).
 * Allows same-origin absolute URLs by stripping to pathname + search.
 */
export function parseSafeReturnPath(
  raw: string | null | undefined,
  origin?: string
): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (decoded.length > 2048) return null;

  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(decoded)) {
    try {
      const u = new URL(decoded);
      const o = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
      if (!o || u.origin !== o) return null;
      decoded = u.pathname + u.search;
    } catch {
      return null;
    }
  }

  if (decoded.startsWith('//') || !decoded.startsWith('/')) return null;
  if (decoded.includes('\\')) return null;

  const pathOnly = decoded.split('?')[0];
  if (pathOnly === '/auth/login') return null;

  return decoded;
}

export function peekPostLoginRedirect(origin?: string): string | null {
  if (typeof window === 'undefined') return null;
  const fromQuery = parseSafeReturnPath(
    new URLSearchParams(window.location.search).get('returnTo'),
    origin
  );
  if (fromQuery) return fromQuery;
  return parseSafeReturnPath(sessionStorage.getItem(LOGIN_RETURN_STORAGE_KEY), origin);
}

export function consumePostLoginRedirect(origin?: string): string | null {
  const path = peekPostLoginRedirect(origin);
  if (!path) return null;
  try {
    sessionStorage.removeItem(LOGIN_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return path;
}
