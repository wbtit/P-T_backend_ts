/**
 * Parses a string in "HH:MM" format and returns the total hours as a decimal.
 * If the string is a simple number, it returns that number.
 * @param timeStr String like "3:20", "03:05", "8", or "8.5"
 * @returns Total hours as a float
 */
export function parseHHMMToHours(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  
  // If it's already a number string like "8.5"
  if (!timeStr.includes(':')) {
    const hours = parseFloat(timeStr);
    return isNaN(hours) ? 0 : hours;
  }

  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;

  return hours + minutes / 60;
}

/**
 * Formats decimal hours into an "HH:MM" string.
 * @param hours Decimal hours like 3.333
 * @returns String like "3:20"
 */
export function formatHoursToHHMM(hours: number): string {
  if (isNaN(hours) || hours <= 0) return "0:00";

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  // Handle rounding edge case where minutes becomes 60
  if (m === 60) {
    return `${h + 1}:00`;
  }

  return `${h}:${m < 10 ? '0' + m : m}`;
}
