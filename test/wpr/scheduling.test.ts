import { DateTime } from "luxon";
import { resolveRunContext, decideClaimAction, resolveEmailMode, MAX_ATTEMPTS, STALE_PENDING_MS } from "../../src/corn-jobs/wprWeekly.logic";
import { aggregateRecipients } from "../../src/modules/wpr/wpr.recipients";

const ZONE = "Asia/Kolkata";

describe("resolveRunContext — weekday/weekEnding computed in WPR_TIMEZONE, not process TZ", () => {
  test("23:30 UTC on a Monday is already Tuesday in Asia/Kolkata (weekday=2)", () => {
    // 2026-09-28 is a Monday (UTC). 23:30 UTC = 2026-09-29 05:00 IST = Tuesday.
    const utcInstant = new Date("2026-09-28T23:30:00.000Z");
    const ctx = resolveRunContext(utcInstant, ZONE);

    expect(ctx.weekday).toBe(2); // ISO Tuesday
    expect(ctx.nowIso).toBe("2026-09-29");
  });

  test("a UTC instant that is still Monday in Asia/Kolkata reports weekday=1", () => {
    // 2026-09-28T10:00:00Z = 2026-09-28 15:30 IST — still Monday.
    const utcInstant = new Date("2026-09-28T10:00:00.000Z");
    const ctx = resolveRunContext(utcInstant, ZONE);
    expect(ctx.weekday).toBe(1);
  });

  test("weekEnding is that week's Sunday 23:59:59.999 IST, regardless of which weekday 'now' falls on", () => {
    const monday = resolveRunContext(new Date("2026-09-28T10:00:00.000Z"), ZONE);
    const wednesday = resolveRunContext(new Date("2026-09-30T10:00:00.000Z"), ZONE);
    expect(monday.weekEndingIso).toBe(wednesday.weekEndingIso);

    const expectedSunday = DateTime.fromISO("2026-10-04T23:59:59.999", { zone: ZONE });
    expect(monday.weekEnding.getTime()).toBe(expectedSunday.toJSDate().getTime());
    expect(monday.weekEndingIso).toBe("2026-10-04");
  });
});

describe("decideClaimAction — idempotent claim state machine (pure)", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");

  test("no existing row -> create", () => {
    expect(decideClaimAction(null, now)).toEqual({ kind: "create" });
  });

  test("SENT -> skip (a second run in the same week never resends)", () => {
    const existing = { id: "d1", status: "SENT" as const, attempts: 1, createdAt: now };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "skip", reason: "already-sent" });
  });

  test("SKIPPED -> skip", () => {
    const existing = { id: "d1", status: "SKIPPED" as const, attempts: 0, createdAt: now };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "skip", reason: "already-skipped" });
  });

  test("FAILED with attempts < MAX_ATTEMPTS -> retry-failed", () => {
    const existing = { id: "d1", status: "FAILED" as const, attempts: MAX_ATTEMPTS - 1, createdAt: now };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "retry-failed", existingId: "d1" });
  });

  test("FAILED at MAX_ATTEMPTS -> skip, no more retries (caps at 3)", () => {
    const existing = { id: "d1", status: "FAILED" as const, attempts: MAX_ATTEMPTS, createdAt: now };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "skip", reason: "max-attempts-exceeded" });
  });

  test("PENDING and fresh (another run likely active) -> skip", () => {
    const createdAt = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes old
    const existing = { id: "d1", status: "PENDING" as const, attempts: 0, createdAt };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "skip", reason: "pending-in-progress" });
  });

  test("PENDING and older than 30 minutes (crashed run) -> retry-stale-pending", () => {
    const createdAt = new Date(now.getTime() - (STALE_PENDING_MS + 1000));
    const existing = { id: "d1", status: "PENDING" as const, attempts: 0, createdAt };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "retry-stale-pending", existingId: "d1" });
  });

  test("PENDING, stale, but already at MAX_ATTEMPTS -> skip (does not retry forever)", () => {
    const createdAt = new Date(now.getTime() - (STALE_PENDING_MS + 1000));
    const existing = { id: "d1", status: "PENDING" as const, attempts: MAX_ATTEMPTS, createdAt };
    expect(decideClaimAction(existing, now)).toEqual({ kind: "skip", reason: "pending-in-progress" });
  });
});

describe("aggregateRecipients — To is client PMs only, CC is global roles + same-department DEPT_MANAGER", () => {
  test("To contains only client project managers, nothing else", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [{ email: "pm1@client.com", isActive: true }, { email: "pm2@client.com", isActive: true }],
      globalCcUsers: [{ email: "admin@wbt.com", isActive: true }],
      departmentManagers: [{ email: "deptmgr@wbt.com", isActive: true }],
    });
    expect(result.to.sort()).toEqual(["pm1@client.com", "pm2@client.com"]);
    expect(result.to).not.toContain("admin@wbt.com");
    expect(result.to).not.toContain("deptmgr@wbt.com");
  });

  test("To de-duplicates multiple client PMs case-insensitively", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [{ email: "PM@Client.com", isActive: true }, { email: "pm@client.com", isActive: true }],
      globalCcUsers: [],
      departmentManagers: [],
    });
    expect(result.to).toEqual(["pm@client.com"]);
  });

  test("CC contains the global roles plus only the same-department DEPT_MANAGER", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [],
      globalCcUsers: [
        { email: "admin@wbt.com", isActive: true },
        { email: "ops@wbt.com", isActive: true },
        { email: "pmo@wbt.com", isActive: true },
      ],
      departmentManagers: [{ email: "dept-detailing@wbt.com", isActive: true }], // caller already scoped this to the project's department
    });
    expect(result.cc.sort()).toEqual(["admin@wbt.com", "dept-detailing@wbt.com", "ops@wbt.com", "pmo@wbt.com"]);
  });

  test("a DEPT_MANAGER from another department never appears — enforced by the caller never passing them in", () => {
    // aggregateRecipients trusts departmentManagers is pre-scoped; the actual department
    // filter is a Prisma `where` clause in resolveWprRecipients, not re-checked here.
    const result = aggregateRecipients({
      clientProjectManagers: [],
      globalCcUsers: [],
      departmentManagers: [{ email: "same-dept-manager@wbt.com", isActive: true }],
    });
    expect(result.cc).toEqual(["same-dept-manager@wbt.com"]);
  });

  test("drops inactive users and users with no email from both lists", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [
        { email: "active-pm@client.com", isActive: true },
        { email: "inactive-pm@client.com", isActive: false },
        { email: null, isActive: true },
      ],
      globalCcUsers: [
        { email: "active-admin@wbt.com", isActive: true },
        { email: "inactive-admin@wbt.com", isActive: false },
      ],
      departmentManagers: [{ email: null, isActive: true }],
    });
    expect(result.to).toEqual(["active-pm@client.com"]);
    expect(result.cc).toEqual(["active-admin@wbt.com"]);
  });

  test("a person who is both a client PM and (somehow) a CC candidate appears only in To", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [{ email: "shared@wbt.com", isActive: true }],
      globalCcUsers: [{ email: "Shared@WBT.com", isActive: true }],
      departmentManagers: [],
    });
    expect(result.to).toEqual(["shared@wbt.com"]);
    expect(result.cc).toEqual([]);
  });

  test("no client PMs at all produces an empty To (caller decides this means SKIPPED), CC can still be non-empty", () => {
    const result = aggregateRecipients({
      clientProjectManagers: [],
      globalCcUsers: [{ email: "admin@wbt.com", isActive: true }],
      departmentManagers: [],
    });
    expect(result.to).toEqual([]);
    expect(result.cc).toEqual(["admin@wbt.com"]);
  });

  test("everything empty produces empty To/CC", () => {
    const result = aggregateRecipients({ clientProjectManagers: [], globalCcUsers: [], departmentManagers: [] });
    expect(result).toEqual({ to: [], cc: [] });
  });
});

describe("resolveEmailMode — must fail closed to DRY_RUN, never default to LIVE", () => {
  test("an explicit opts.mode always wins over the env var", () => {
    expect(resolveEmailMode("LIVE", "DRY_RUN")).toBe("LIVE");
    expect(resolveEmailMode("INTERNAL", undefined)).toBe("INTERNAL");
  });

  test("WPR_EMAIL_MODE unset -> DRY_RUN", () => {
    expect(resolveEmailMode(undefined, undefined)).toBe("DRY_RUN");
  });

  test("WPR_EMAIL_MODE empty string -> DRY_RUN", () => {
    expect(resolveEmailMode(undefined, "")).toBe("DRY_RUN");
  });

  test("WPR_EMAIL_MODE set to an invalid value -> DRY_RUN, NOT LIVE", () => {
    expect(resolveEmailMode(undefined, "banana")).toBe("DRY_RUN");
    expect(resolveEmailMode(undefined, "live")).toBe("DRY_RUN"); // wrong case is invalid, not an alias
    expect(resolveEmailMode(undefined, "LIVE ")).toBe("DRY_RUN"); // stray whitespace is invalid
  });

  test("WPR_EMAIL_MODE set to a valid value is honored", () => {
    expect(resolveEmailMode(undefined, "INTERNAL")).toBe("INTERNAL");
    expect(resolveEmailMode(undefined, "LIVE")).toBe("LIVE");
    expect(resolveEmailMode(undefined, "DRY_RUN")).toBe("DRY_RUN");
  });
});
