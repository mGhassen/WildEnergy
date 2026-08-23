/**
 * Centralized date formatting utilities for the entire project
 * All date formatting should use these functions for consistency
 */

import { DATE_LOCALE, TIME_LOCALE, TIMEZONE } from './config';

/** YYYY-MM-DD in app timezone (or from an ISO date prefix). */
export function toDateKey(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

function addUtcDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffUtcDays(startKey: string, endKey: string): number {
  const start = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Subscription end is exclusive midnight: end = start + duration.
 * Active while calendar today < end_date (dies at that midnight).
 * 1-day plan: start=D, end=D+1 → valid only on D.
 */
export function isSubscriptionActiveByEndDate(
  endDate: string | Date | null | undefined,
  from: Date = new Date(),
): boolean {
  const endKey = toDateKey(endDate);
  const fromKey = toDateKey(from);
  if (!endKey || !fromKey) return false;
  return endKey > fromKey;
}

/**
 * Whether a subscription covers a calendar day (course date).
 * Inclusive start, exclusive end — same rule as live eligibility.
 */
export function isSubscriptionValidOnDate(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  asOf: string | Date = new Date(),
): boolean {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  const asOfKey = toDateKey(asOf);
  if (!startKey || !endKey || !asOfKey) return false;
  return startKey <= asOfKey && endKey > asOfKey;
}

/** Sold duration in days (exclusive end − start). */
export function subscriptionDurationDays(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): number {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  if (!startKey || !endKey) return 0;
  return Math.max(0, diffUtcDays(startKey, endKey));
}

/** Days left including today; 0 = expired (at/after exclusive end midnight). */
export function subscriptionDaysRemaining(
  endDate: string | Date | null | undefined,
  from: Date = new Date(),
): number {
  const endKey = toDateKey(endDate);
  const fromKey = toDateKey(from);
  if (!endKey || !fromKey) return 0;
  return Math.max(0, diffUtcDays(fromKey, endKey));
}

/** end = start + durationDays (exclusive midnight). */
export function calculateSubscriptionEndDate(startDate: string, durationDays: number): string {
  const startKey = toDateKey(startDate);
  if (!startKey) throw new Error('Invalid start date');
  const days = Math.max(1, Number(durationDays) || 1);
  return addUtcDays(startKey, days);
}

/** Display stored start/end as-is (same values as DB / edit form). */
export function formatSubscriptionPeriod(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string {
  if (!startDate || !endDate) return 'N/A';
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  if (!startKey || !endKey) return 'Plage de dates invalide';
  if (startKey === endKey) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Format date in European format (DD/MM/YYYY)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return dateObj.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format date in French format with time (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }
  
  return dateObj.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE
  });
}

/**
 * Format date in French format (DD/MM/YYYY) - alias for formatDate
 */
export function formatFrenchDate(date: string | Date | null | undefined): string {
  return formatDate(date);
}

/**
 * Format time in HH:MM format
 */
export function formatTime(time: string | Date | null | undefined): string {
  if (!time) {
    return 'Heure non définie';
  }
  
  if (typeof time === 'string') {
    // Handle time strings like "10:00:00" or "10:00"
    const timeParts = time.split(':');
    if (timeParts.length >= 2) {
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return time;
  }
  
  const dateObj = time;
  if (isNaN(dateObj.getTime())) {
    return 'Heure invalide';
  }
  
  return dateObj.toLocaleTimeString(TIME_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE
  });
}

/**
 * Format date in long format (e.g., "mercredi 16 juillet 2025")
 */
export function formatLongDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }
  
  return dateObj.toLocaleDateString(DATE_LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format date in short format (e.g., "16 juil. 2025")
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }
  
  return dateObj.toLocaleDateString(DATE_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format date for display in calendar (e.g., "16 juil.")
 */
export function formatCalendarDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }
  
  return dateObj.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: 'short',
    timeZone: TIMEZONE
  });
}

/**
 * Format date range (generic).
 */
export function formatDateRange(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string {
  if (!startDate || !endDate) {
    return 'N/A';
  }

  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  if (!startKey || !endKey) {
    return 'Plage de dates invalide';
  }

  if (startKey === endKey) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Format relative time (e.g., "il y a 2 heures", "il y a 3 jours")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'À l\'instant';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`;
  }
  
  return formatShortDate(dateObj);
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) {
    return false;
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string | Date | null | undefined): boolean {
  if (!date) {
    return false;
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return dateObj < now;
}

/**
 * Get day name from day number (0 = dimanche, 1 = lundi, etc.)
 */
export function getDayName(dayNumber: number): string {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return days[dayNumber] || 'Inconnu';
}

/**
 * Get short day name from day number (0 = dim, 1 = lun, etc.)
 */
export function getShortDayName(dayNumber: number): string {
  const days = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  return days[dayNumber] || 'Inconnu';
} 