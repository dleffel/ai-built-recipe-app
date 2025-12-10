/**
 * Birthday utility functions for the CRM
 * Handles formatting and parsing of birthday dates with optional year support
 */

// Sentinel year used when the birth year is unknown
const UNKNOWN_YEAR = 1900;

/**
 * Format a birthday for display
 * @param birthday - ISO date string or null
 * @returns Formatted string like "January 15" or "January 15, 1985 (39 years old)"
 */
export function formatBirthday(birthday: string | null): string | null {
  if (!birthday) return null;
  
  const date = new Date(birthday);
  // Use UTC methods to avoid timezone issues - the date is stored as UTC
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  
  if (year === UNKNOWN_YEAR) {
    return `${month} ${day}`;
  }
  
  const age = calculateAge(date);
  return `${month} ${day}, ${year} (${age} years old)`;
}

/**
 * Calculate age from a birth date
 * @param birthDate - Date object representing the birth date
 * @returns Age in years
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  // Use UTC methods for consistent age calculation
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  
  return age;
}

/**
 * Parse birthday input components into an ISO date string
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @param year - Year (optional, uses sentinel value if not provided)
 * @returns ISO date string
 */
export function parseBirthdayInput(month: number, day: number, year?: number): string {
  const effectiveYear = year ?? UNKNOWN_YEAR;
  // Use Date.UTC to create a UTC date, avoiding timezone issues
  const date = new Date(Date.UTC(effectiveYear, month - 1, day));
  return date.toISOString();
}

/**
 * Check if a birthday has a known year
 * @param birthday - ISO date string
 * @returns true if the year is known, false if it's the sentinel value
 */
export function hasKnownYear(birthday: string): boolean {
  return new Date(birthday).getUTCFullYear() !== UNKNOWN_YEAR;
}

/**
 * Parse a birthday ISO string into its components
 * @param birthday - ISO date string or null
 * @returns Object with month, day, and optional year
 */
export function parseBirthdayComponents(birthday: string | null): {
  month: number | null;
  day: number | null;
  year: number | null;
} {
  if (!birthday) {
    return { month: null, day: null, year: null };
  }
  
  const date = new Date(birthday);
  // Use UTC methods to avoid timezone issues
  const year = date.getUTCFullYear();
  
  return {
    month: date.getUTCMonth() + 1, // Convert from 0-indexed to 1-indexed
    day: date.getUTCDate(),
    year: year === UNKNOWN_YEAR ? null : year,
  };
}

/**
 * Get the sentinel year value used for unknown birth years
 */
export function getUnknownYearSentinel(): number {
  return UNKNOWN_YEAR;
}

/**
 * Validate birthday components
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @param year - Year (optional)
 * @returns true if valid, false otherwise
 */
export function isValidBirthday(month: number, day: number, year?: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Check for valid day in month
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;
  
  // If year is provided, validate it
  if (year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    
    // Check for leap year if February 29
    if (month === 2 && day === 29) {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeapYear) return false;
    }
  }
  
  return true;
}