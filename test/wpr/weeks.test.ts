import { DateTime } from "luxon";
import { getMonday, getSunday, buildProjectWeeks, isUpToWeek } from "../../src/modules/wpr/wpr.weeks";

const ZONE = "Asia/Kolkata";

describe("wpr.weeks — timezone boundaries (Asia/Kolkata)", () => {
  test("23:59:59 IST on a Sunday still belongs to that week (Monday stays the same)", () => {
    // Sunday 2025-09-28 23:59:00 IST
    const sundayLateIst = DateTime.fromISO("2025-09-28T23:59:00", { zone: ZONE }).toJSDate();
    const monday = getMonday(sundayLateIst, ZONE);

    const expectedMonday = DateTime.fromISO("2025-09-22T00:00:00", { zone: ZONE });
    expect(monday.getTime()).toBe(expectedMonday.toJSDate().getTime());
  });

  test("00:00:01 IST on the following Monday rolls into the NEXT week", () => {
    // Monday 2025-09-29 00:00:01 IST — one second after the previous test's Sunday-night instant
    const mondayEarlyIst = DateTime.fromISO("2025-09-29T00:00:01", { zone: ZONE }).toJSDate();
    const monday = getMonday(mondayEarlyIst, ZONE);

    const expectedMonday = DateTime.fromISO("2025-09-29T00:00:00", { zone: ZONE });
    expect(monday.getTime()).toBe(expectedMonday.toJSDate().getTime());
  });

  test("getSunday returns 23:59:59.999 IST of the same week", () => {
    const wednesdayIst = DateTime.fromISO("2025-09-24T12:00:00", { zone: ZONE }).toJSDate();
    const sunday = getSunday(wednesdayIst, ZONE);

    const expectedSunday = DateTime.fromISO("2025-09-28T23:59:59.999", { zone: ZONE });
    expect(sunday.getTime()).toBe(expectedSunday.toJSDate().getTime());
  });

  test("a UTC instant that is already Monday in IST does not leak into Sunday's week", () => {
    // 2025-09-28T20:00:00Z = 2025-09-29T01:30 IST (Monday) — a classic UTC/IST day-boundary trap.
    const utcInstant = new Date("2025-09-28T20:00:00.000Z");
    const monday = getMonday(utcInstant, ZONE);

    const expectedMonday = DateTime.fromISO("2025-09-29T00:00:00", { zone: ZONE });
    expect(monday.getTime()).toBe(expectedMonday.toJSDate().getTime());
  });

  test("project starting mid-week (Sunday) rolls its first week back to the preceding Monday", () => {
    // Project starts on a Sunday: 2025-09-21 (IST)
    const weeks = buildProjectWeeks(
      { startDate: "2025-09-21T06:00:00.000Z", endDate: "2025-09-21T06:00:00.000Z" },
      ZONE,
      new Date("2025-09-21T06:00:00.000Z")
    );

    expect(weeks.length).toBeGreaterThan(0);
    const firstWeekMonday = DateTime.fromJSDate(weeks[0].start, { zone: ZONE });
    expect(firstWeekMonday.weekday).toBe(1); // ISO Monday
    // 2025-09-21 IST is a Sunday, so the containing week's Monday is 2025-09-15.
    expect(firstWeekMonday.toISODate()).toBe("2025-09-15");
  });

  test("a project with no start date produces no weeks", () => {
    expect(buildProjectWeeks({ startDate: null } as any, ZONE)).toEqual([]);
    expect(buildProjectWeeks({} as any, ZONE)).toEqual([]);
  });

  test("the current week is always included even for a project long past its fabrication date", () => {
    const now = new Date("2025-09-24T10:00:00.000Z");
    const weeks = buildProjectWeeks(
      { startDate: "2024-01-01T00:00:00.000Z", fabricationDate: "2024-03-01T00:00:00.000Z" },
      ZONE,
      now
    );
    const last = weeks[weeks.length - 1];
    const nowSunday = getSunday(now, ZONE);
    expect(last.end.getTime()).toBe(nowSunday.getTime());
  });

  test("isUpToWeek is cumulative (on-or-before), not a Mon-Sun range check", () => {
    const weekEnd = DateTime.fromISO("2025-09-28T23:59:59.999", { zone: ZONE }).toJSDate();
    // A date from a much earlier week is still "up to" this week's end.
    expect(isUpToWeek("2025-01-05T00:00:00.000Z", weekEnd)).toBe(true);
    // A date after the week end is not.
    expect(isUpToWeek("2025-09-29T00:00:01.000Z", weekEnd)).toBe(false);
    // Sentinel strings never count as a real date.
    expect(isUpToWeek("—", weekEnd)).toBe(false);
    expect(isUpToWeek("Waiting...", weekEnd)).toBe(false);
    expect(isUpToWeek(null, weekEnd)).toBe(false);
  });
});
