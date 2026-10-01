import { DateTime } from "luxon";
import { WprDeliveryStatus } from "@prisma/client";
import { getSunday, formatIsoDate, WPR_TIMEZONE } from "../modules/wpr/wpr.weeks";

/**
 * Pure logic for the WPR weekly job, deliberately split out of
 * wprWeekly.ts: that file's import graph pulls in Prisma, mail, and every
 * service module (transitively including the client module's bcrypt-ts,
 * which is ESM-only and unparseable under this repo's Jest/ts-jest CJS
 * transform). Keeping the decision logic here — no DB, no I/O — means it
 * can be unit tested directly instead of only through a live run.
 */

export const MAX_ATTEMPTS = 3;
export const STALE_PENDING_MS = 30 * 60 * 1000; // 30 minutes — treat as a crashed run

export type WprJobMode = "DRY_RUN" | "INTERNAL" | "LIVE";
const VALID_MODES: WprJobMode[] = ["DRY_RUN", "INTERNAL", "LIVE"];

/**
 * Resolves the effective send mode. An explicit `optsMode` (as passed by
 * scripts/wprRun.ts, already validated there) always wins. Otherwise
 * `envValue` (WPR_EMAIL_MODE) is used ONLY if it's exactly one of the three
 * valid modes — unset, empty, or anything else invalid (a typo, a stray
 * value) falls back to DRY_RUN, never LIVE. This is the one guard standing
 * between a bad env var and emailing real clients, so it fails closed.
 */
export function resolveEmailMode(optsMode: WprJobMode | undefined, envValue: string | undefined): WprJobMode {
  if (optsMode) return optsMode;
  if (envValue && (VALID_MODES as string[]).includes(envValue)) return envValue as WprJobMode;
  return "DRY_RUN";
}

export interface RunContext {
  nowIso: string; // the calendar date, in `zone`
  weekday: number; // ISO: 1=Monday..7=Sunday, in `zone`
  weekEnding: Date;
  weekEndingIso: string;
}

/** Pure: "today" and its ISO weekday, and this week's Sunday — all computed in `zone`, never the process timezone. */
export function resolveRunContext(now: Date, zone: string = WPR_TIMEZONE): RunContext {
  const nowZoned = DateTime.fromJSDate(now, { zone: "utc" }).setZone(zone);
  const weekEnding = getSunday(now, zone);
  return {
    nowIso: nowZoned.toISODate() as string,
    weekday: nowZoned.weekday,
    weekEnding,
    weekEndingIso: formatIsoDate(weekEnding, zone),
  };
}

export interface ExistingDeliveryLike {
  id: string;
  status: WprDeliveryStatus;
  attempts: number;
  createdAt: Date;
}

export type ClaimDecision =
  | { kind: "create" }
  | { kind: "retry-failed"; existingId: string }
  | { kind: "retry-stale-pending"; existingId: string }
  | { kind: "skip"; reason: "already-sent" | "already-skipped" | "max-attempts-exceeded" | "pending-in-progress" };

/**
 * Pure decision core of the idempotent claim (no DB access — wprWeekly.ts's
 * claimDelivery does the actual atomic updateMany that carries this out).
 * `existing` is null when no delivery row exists yet for this
 * (project, weekEnding, mode).
 */
export function decideClaimAction(existing: ExistingDeliveryLike | null, now: Date = new Date()): ClaimDecision {
  if (!existing) return { kind: "create" };

  if (existing.status === "SENT") return { kind: "skip", reason: "already-sent" };
  if (existing.status === "SKIPPED") return { kind: "skip", reason: "already-skipped" };

  if (existing.status === "FAILED") {
    if (existing.attempts >= MAX_ATTEMPTS) return { kind: "skip", reason: "max-attempts-exceeded" };
    return { kind: "retry-failed", existingId: existing.id };
  }

  // PENDING: either another run is actively working it (leave alone), or a prior run crashed mid-flight.
  const ageMs = now.getTime() - existing.createdAt.getTime();
  if (ageMs > STALE_PENDING_MS && existing.attempts < MAX_ATTEMPTS) {
    return { kind: "retry-stale-pending", existingId: existing.id };
  }
  return { kind: "skip", reason: "pending-in-progress" };
}
