import { toDate, format, formatInTimeZone } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

const PT_TIMEZONE = 'America/Los_Angeles';

/**
 * Converts a date to PT timezone
 */
export function toPTTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toDate(dateObj, { timeZone: PT_TIMEZONE });
}

/**
 * Converts a date from PT timezone to UTC
 */
export function fromPTTimezoneToUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toDate(dateObj, { timeZone: PT_TIMEZONE });
}

/**
 * Formats a date in PT timezone
 */
export function formatInPTTimezone(date: Date | string, formatStr: string): string {
  const ptDate = toDate(
    typeof date === 'string' ? new Date(date) : date,
    { timeZone: PT_TIMEZONE }
  );
  return format(ptDate, formatStr, { timeZone: PT_TIMEZONE });
}

/**
 * Gets the start of day in PT timezone
 */
export function getStartOfDayPT(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const ptDate = toDate(dateObj, { timeZone: PT_TIMEZONE });
  const startOfDayPT = startOfDay(ptDate);
  return toDate(startOfDayPT, { timeZone: PT_TIMEZONE });
}

/**
 * Gets the end of day in PT timezone
 */
export function getEndOfDayPT(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const ptDate = toDate(dateObj, { timeZone: PT_TIMEZONE });
  const endOfDayPT = endOfDay(ptDate);
  return toDate(endOfDayPT, { timeZone: PT_TIMEZONE });
}

/**
 * Converts a date to YYYY-MM-DD format in PT timezone
 */
export function toDateStringPT(date: Date | string): string {
  return formatInTimeZone(
    typeof date === 'string' ? new Date(date) : date,
    PT_TIMEZONE,
    'yyyy-MM-dd'
  );
}

/**
 * Creates a date object for a specific day in PT timezone
 * This ensures the date is properly set to midnight in PT timezone
 */
export function createPTDate(dateStr: string | Date): Date {
  // If it's already a Date object, convert to ISO string first
  const isoDateStr = typeof dateStr === 'string' 
    ? dateStr 
    : dateStr.toISOString();
  
  // Extract just the date part (YYYY-MM-DD)
  const datePart = isoDateStr.split('T')[0];
  
  // Create a date at midnight in PT timezone
  return toDate(new Date(`${datePart}T00:00:00`), { timeZone: PT_TIMEZONE });
}

/**
 * Groups tasks by day in PT timezone
 */
export function groupByDayPT<T extends { dueDate: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const dayKey = toDateStringPT(item.dueDate);
    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}