/**
 * Centralized configuration for the entire application
 * All currency, locale, and formatting settings should be defined here
 */

// Currency configuration
export const CURRENCY = {
  code: process.env.NEXT_PUBLIC_CURRENCY_CODE || 'TND',
  symbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'TND',
  locale: process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'fr-FR', // French locale for better TND support
};

// Date and time configuration
export const LOCALE = {
  date: process.env.NEXT_PUBLIC_DATE_LOCALE || 'fr-FR', // French locale
  time: process.env.NEXT_PUBLIC_TIME_LOCALE || 'fr-FR',
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'Africa/Tunis',
};

// Add a comment about environment variables
// Add these to your .env.local file:
// NEXT_PUBLIC_CURRENCY_CODE=TND
// NEXT_PUBLIC_CURRENCY_SYMBOL=TND
// NEXT_PUBLIC_CURRENCY_LOCALE=fr-FR
// NEXT_PUBLIC_DATE_LOCALE=fr-FR
// NEXT_PUBLIC_TIME_LOCALE=fr-FR
// NEXT_PUBLIC_TIMEZONE=Africa/Tunis

// Formatting options
export const FORMAT_OPTIONS = {
  currency: {
    style: 'currency' as const,
    currency: CURRENCY.code,
    locale: CURRENCY.locale,
  },
  number: {
    locale: CURRENCY.locale,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  date: {
    locale: LOCALE.date,
    timeZone: LOCALE.timezone,
  },
  time: {
    locale: LOCALE.time,
    timeZone: LOCALE.timezone,
  },
};

// Utility functions for consistent formatting
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0,00 TND';
  
  // Format the number with French locale (comma as decimal separator)
  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
  
  // Always append TND
  const result = `${formattedNumber} TND`;
  console.log('formatCurrency:', { amount, numAmount, formattedNumber, result });
  return result;
};

export const formatNumber = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0.00';
  
  return new Intl.NumberFormat(FORMAT_OPTIONS.number.locale, {
    minimumFractionDigits: FORMAT_OPTIONS.number.minimumFractionDigits,
    maximumFractionDigits: FORMAT_OPTIONS.number.maximumFractionDigits,
  }).format(numAmount);
};

// Export commonly used values
export const CURRENCY_SYMBOL = CURRENCY.symbol;
export const CURRENCY_CODE = CURRENCY.code;
export const DATE_LOCALE = LOCALE.date;
export const TIME_LOCALE = LOCALE.time;
export const TIMEZONE = LOCALE.timezone;
