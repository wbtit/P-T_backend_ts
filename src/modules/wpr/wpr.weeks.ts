import { DateTime } from "luxon";

/**
 * Week math for the WPR/WBR report, ported verbatim from the frontend's
 * wpr/WorkProgressReport.tsx (getMonday / getSunday / projectWeeks /
 * isWithinWeek / isUpToWeek).
 *
 * The FE computes all of this in the browser's local timezone via plain
 * `Date`. The backend has no "browser timezone" — every boundary here is
 * computed in one explicit zone (WPR_TIMEZONE, default Asia/Kolkata) so a
 * cron running at any server time produces the same week the FE user saw.
 */

export const WPR_TIMEZONE = process.env.WPR_TIMEZONE || "Asia/Kolkata";

export interface ReportWeek {
  index: number;
  label: string;
  /** Monday 00:00:00.000 of the week, in WPR_TIMEZONE, as a JS Date (UTC instant). */
  start: Date;
  /** Sunday 23:59:59.999 of the week, in WPR_TIMEZONE, as a JS Date (UTC instant). */
  end: Date;
}

const zoned = (input: Date | string, zone: string = WPR_TIMEZONE): DateTime => {
  const dt =
    typeof input === "string"
      ? DateTime.fromISO(input, { zone: "utc" }).setZone(zone)
      : DateTime.fromJSDate(input, { zone: "utc" }).setZone(zone);
  return dt;
};

/** Monday 00:00:00.000 of the week containing `d`, in `zone`. Mirrors the FE's getMonday. */
export const getMonday = (d: Date | string, zone: string = WPR_TIMEZONE): Date => {
  const date = zoned(d, zone);
  // Luxon: Monday=1 ... Sunday=7 (ISO). FE used JS Date.getDay() where Sunday=0.
  const isoWeekday = date.weekday; // 1..7, Monday..Sunday
  const monday = date.minus({ days: isoWeekday - 1 }).startOf("day");
  return monday.toJSDate();
};

/** Sunday 23:59:59.999 of the week containing `d`, in `zone`. Mirrors the FE's getSunday. */
export const getSunday = (d: Date | string, zone: string = WPR_TIMEZONE): Date => {
  const mondayZoned = zoned(getMonday(d, zone), zone);
  const sunday = mondayZoned.plus({ days: 6 }).endOf("day");
  return sunday.toJSDate();
};

/** True if `dateStr` falls within [start, end] inclusive. Mirrors the FE's isWithinWeek. */
export const isWithinWeek = (
  dateStr: string | Date | null | undefined,
  start: Date,
  end: Date
): boolean => {
  if (!dateStr || dateStr === "—" || dateStr === "Waiting...") return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= start && d <= end;
};

/**
 * True if `dateStr` is on or before `end`. This is the FE's actual per-week
 * filter used everywhere in the report (cumulative "as of week end", not an
 * isolated Mon-Sun delta) — ported exactly, do not change to a range check.
 */
export const isUpToWeek = (dateStr: string | Date | null | undefined, end: Date): boolean => {
  if (!dateStr || dateStr === "—" || dateStr === "Waiting...") return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d <= end;
};

/**
 * Generate the list of Monday-Sunday weeks from the project's start date to
 * fabricationDate || endDate || today, with the current week always
 * included — ported from the FE's `projectWeeks` useMemo.
 */
export const buildProjectWeeks = (
  project: { startDate?: Date | string | null; fabricationDate?: Date | string | null; endDate?: Date | string | null },
  zone: string = WPR_TIMEZONE,
  now: Date = new Date()
): ReportWeek[] => {
  if (!project || !project.startDate) return [];

  const start = new Date(project.startDate);
  if (isNaN(start.getTime())) return [];

  let end = now;
  if (project.fabricationDate) {
    const fabDate = new Date(project.fabricationDate);
    if (!isNaN(fabDate.getTime())) end = fabDate;
  } else if (project.endDate) {
    const eDate = new Date(project.endDate);
    if (!isNaN(eDate.getTime())) end = eDate;
  }

  // Ensure the current week is always covered
  const todaySunday = getSunday(now, zone);
  if (end < todaySunday) end = todaySunday;

  const startMon = getMonday(start, zone);
  const endSun = getSunday(end, zone);

  const weeks: ReportWeek[] = [];
  let currentMon = zoned(startMon, zone);

  while (currentMon.toJSDate() <= endSun) {
    const currentSun = getSunday(currentMon.toJSDate(), zone);
    const label = `Week ${weeks.length + 1} (${formatShortDate(currentMon.toJSDate(), zone)} - ${formatShortDate(
      currentSun,
      zone
    )})`;
    weeks.push({
      index: weeks.length + 1,
      start: currentMon.toJSDate(),
      end: currentSun,
      label,
    });
    currentMon = currentMon.plus({ days: 7 });
  }

  return weeks;
};

/** Snap an arbitrary date to that week's Sunday (23:59:59.999, WPR_TIMEZONE). */
export const snapToWeekEndingSunday = (d: Date | string, zone: string = WPR_TIMEZONE): Date =>
  getSunday(d, zone);

/** The current week's Sunday (23:59:59.999, WPR_TIMEZONE), i.e. "no weekEnding given" default. */
export const currentWeekEnding = (zone: string = WPR_TIMEZONE, now: Date = new Date()): Date =>
  getSunday(now, zone);

// ---------------------------------------------------------------------------
// Formatting — mirrors the FE's toLocaleDateString("en-US", ...) calls,
// but pinned to WPR_TIMEZONE instead of the browser's local zone.
// ---------------------------------------------------------------------------

/** en-US short date, e.g. "Sep 28". Mirrors {month:"short", day:"numeric"}. */
export const formatShortDate = (d: Date | string, zone: string = WPR_TIMEZONE): string =>
  zoned(d, zone).toFormat("LLL d");

/** en-US numeric date, e.g. "9/28/2025". Mirrors bare toLocaleDateString("en-US"). */
export const formatNumericDate = (d: Date | string | null | undefined, zone: string = WPR_TIMEZONE): string => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return zoned(dt, zone).toFormat("M/d/yyyy");
};

/** en-US long date, e.g. "September 28, 2025". Mirrors {month:"long", day:"numeric", year:"numeric"}. */
export const formatLongDate = (d: Date | string, zone: string = WPR_TIMEZONE): string =>
  zoned(d, zone).toFormat("LLLL d, yyyy");

/** MM/DD/YYYY, e.g. "09/28/2025". Mirrors {month:"2-digit", day:"2-digit", year:"numeric"}. */
export const formatSlashDate = (d: Date | string, zone: string = WPR_TIMEZONE): string =>
  zoned(d, zone).toFormat("MM/dd/yyyy");

/** ISO date only (YYYY-MM-DD), used for filenames / query params. */
export const formatIsoDate = (d: Date | string, zone: string = WPR_TIMEZONE): string =>
  zoned(d, zone).toFormat("yyyy-MM-dd");
