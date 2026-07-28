/**
 * Checks if the current time in IST (Asia/Kolkata) is within the allowed working hours window:
 * 7:00 AM to 11:55 PM.
 *
 * @returns {boolean} True if within the window, False otherwise.
 */
export function isWithinWorkingHoursIST(): boolean {
  const now = new Date();

  // Create a formatter that returns parts in IST
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  });

  const parts = formatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value;
  const minutePart = parts.find((p) => p.type === "minute")?.value;

  if (!hourPart || !minutePart) return true; // fallback if parsing fails

  let hour = parseInt(hourPart, 10);
  if (hour === 24) hour = 0; // standard fallback for midnight in some Node versions
  const minute = parseInt(minutePart, 10);

  // Time should be >= 07:00 and <= 23:55
  if (hour < 7) {
    return false;
  }
  
  if (hour === 23 && minute > 55) {
    return false;
  }

  return true;
}
