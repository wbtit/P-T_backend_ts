import { Prisma, WprDeliveryMode } from "@prisma/client";
import prisma from "../config/database/client";
import logger from "../utils/logger";
import { sendEmail } from "../services/mailServices/mailconfig";
import { MailAttachment } from "../services/mail/MailService";
import { buildWprEmailHtml } from "../services/mailServices/mailtemplates/wprMailTemplate";
import { getReportPdf } from "../modules/wpr/wpr.service";
import { WprRequestUser } from "../modules/wpr/wpr.repository";
import { resolveWprRecipients, ResolvedWprRecipients } from "../modules/wpr/wpr.recipients";
import { formatSlashDate, WPR_TIMEZONE } from "../modules/wpr/wpr.weeks";
import { MAX_ATTEMPTS, resolveRunContext, decideClaimAction, resolveEmailMode, WprJobMode } from "./wprWeekly.logic";
export { MAX_ATTEMPTS, STALE_PENDING_MS, resolveRunContext, decideClaimAction, resolveEmailMode } from "./wprWeekly.logic";
export type { RunContext, ExistingDeliveryLike, ClaimDecision, WprJobMode } from "./wprWeekly.logic";

/**
 * Weekly WPR/WBR delivery job. Reuses Phase 1's report service (and its
 * generation semaphore) as-is — this file is orchestration + idempotent
 * bookkeeping + email, never a second report generator.
 */

export interface RunWprWeeklyOptions {
  /** Pretend "now" is this instant (still interpreted in WPR_TIMEZONE). Defaults to the real current time. */
  date?: Date;
  fabricatorId?: string;
  mode?: WprJobMode;
}

export interface RunWprWeeklySummary {
  date: string;
  weekday: number;
  weekEnding: string;
  fabricators: number;
  projectsConsidered: number;
  sent: number;
  skipped: number;
  skippedNoClientPM: number; // subset of `skipped` — projects with no client project managers to send To
  failed: number;
  rssMb: number;
}

const GRAPH_INLINE_ATTACHMENT_LIMIT_BYTES = 3 * 1024 * 1024;

// A fixed, non-personal identity for report generation triggered by the job
// itself (not on behalf of any real logged-in user). ADMIN bypasses the
// per-project ownership check in wpr.service.ts, which is correct here —
// the job already scoped itself to exactly one project via the fabricator's
// own projects, never anything unscoped.
const SYSTEM_USER: WprRequestUser = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" };

// ---------------------------------------------------------------------------
// Idempotent claim
// ---------------------------------------------------------------------------

interface ClaimedDelivery {
  deliveryId: string;
}

async function claimDelivery(
  projectId: string,
  fabricatorId: string,
  weekEnding: Date,
  mode: WprDeliveryMode
): Promise<ClaimedDelivery | null> {
  try {
    const created = await prisma.wprDelivery.create({
      data: { projectId, fabricatorId, weekEnding, mode, status: "PENDING" },
    });
    return { deliveryId: created.id };
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
  }

  // A delivery row for this (project, weekEnding, mode) already exists — decide whether to (re)claim it.
  const existing = await prisma.wprDelivery.findUnique({
    where: { projectId_weekEnding_mode: { projectId, weekEnding, mode } },
  });
  const decision = decideClaimAction(existing, new Date());

  if (decision.kind === "skip" || decision.kind === "create") return null; // "create" here means the row vanished mid-race

  const claim = await prisma.wprDelivery.updateMany({
    where: { id: decision.existingId, status: existing!.status },
    data:
      decision.kind === "retry-failed"
        ? { status: "PENDING", attempts: { increment: 1 } }
        : { attempts: { increment: 1 } },
  });
  return claim.count === 1 ? { deliveryId: decision.existingId } : null;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

async function dispatchEmail(params: {
  mode: WprJobMode;
  projectName: string;
  fabricatorName: string;
  weekEnding: Date;
  recipients: ResolvedWprRecipients;
  buffer: Buffer;
  filename: string;
}): Promise<void> {
  const { mode, projectName, fabricatorName, weekEnding, recipients, buffer, filename } = params;
  const weekEndingDisplay = formatSlashDate(weekEnding, WPR_TIMEZONE);
  const subject = `Weekly Progress Report - ${projectName} - Week ending ${weekEndingDisplay}`;

  const attachment: MailAttachment = {
    name: filename,
    contentType: "application/pdf",
    contentBytes: buffer.toString("base64"),
  };
  const encodedBytes = Buffer.byteLength(attachment.contentBytes, "utf8");
  if (encodedBytes > GRAPH_INLINE_ATTACHMENT_LIMIT_BYTES) {
    throw new Error(
      `PDF too large for an inline email attachment (${(encodedBytes / 1024 / 1024).toFixed(1)}MB encoded, limit ~3MB) — ` +
        `upload-session attachments are not implemented in this phase`
    );
  }

  if (mode === "DRY_RUN") {
    const sizeKb = (buffer.length / 1024).toFixed(1);
    logger.info(
      `[WPR][DRY_RUN] subject="${subject}" sizeKb=${sizeKb} would send to To: [${recipients.to.join(", ")}] CC: [${recipients.cc.join(", ")}]`
    );
    return;
  }

  if (mode === "INTERNAL") {
    const testRecipients = (process.env.WPR_TEST_RECIPIENTS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (testRecipients.length === 0) {
      throw new Error("WPR_TEST_RECIPIENTS is required (and empty) for INTERNAL mode");
    }
    await sendEmail({
      to: testRecipients,
      subject: `[TEST] ${subject}`,
      // testBanner is ONLY ever constructed here, in the INTERNAL branch — LIVE
      // below never builds one, so the banner cannot leak into a real send.
      html: buildWprEmailHtml({
        projectName,
        weekEnding: weekEndingDisplay,
        fabricatorName,
        filename,
        testBanner: { to: recipients.to, cc: recipients.cc },
      }),
      attachments: [attachment],
      allowNonProduction: true, // WPR-only bypass — see mailconfig.ts's SendEmailInput doc comment
    });
    return;
  }

  // LIVE
  await sendEmail({
    to: recipients.to,
    cc: recipients.cc.length ? recipients.cc : undefined,
    subject,
    html: buildWprEmailHtml({ projectName, weekEnding: weekEndingDisplay, fabricatorName, filename }),
    attachments: [attachment],
  });
}

// ---------------------------------------------------------------------------
// Per-project processing
// ---------------------------------------------------------------------------

type ProjectOutcome = "sent" | "skipped-no-recipients" | "failed";

async function processProject(
  deliveryId: string,
  project: { id: string; name: string },
  fabricator: { id: string; fabName: string },
  weekEnding: Date,
  weekEndingIso: string,
  mode: WprJobMode
): Promise<ProjectOutcome> {
  try {
    const recipients = await resolveWprRecipients(project.id, fabricator.id);

    // To is Project.clientProjectManagers only now — if there are none, there is
    // no one to send To (CC-only delivery is not a thing this job does).
    if (recipients.to.length === 0) {
      await prisma.wprDelivery.update({
        where: { id: deliveryId },
        data: { status: "SKIPPED", error: "no client project managers", recipients: recipients as unknown as Prisma.InputJsonValue },
      });
      return "skipped-no-recipients";
    }

    // The PDF is generated in memory and attached directly to the email —
    // it is never written to disk (filePath stays null; the column remains
    // in the schema but this job no longer fills it).
    const { buffer, filename } = await getReportPdf(project.id, SYSTEM_USER, weekEndingIso);

    await prisma.wprDelivery.update({
      where: { id: deliveryId },
      data: { recipients: recipients as unknown as Prisma.InputJsonValue },
    });

    await dispatchEmail({ mode, projectName: project.name, fabricatorName: fabricator.fabName, weekEnding, recipients, buffer, filename });

    await prisma.wprDelivery.update({ where: { id: deliveryId }, data: { status: "SENT", sentAt: new Date() } });
    return "sent";
  } catch (err: any) {
    const message = String(err?.message || err).slice(0, 500);
    await prisma.wprDelivery
      .update({ where: { id: deliveryId }, data: { status: "FAILED", error: message } })
      .catch((updateErr) => logger.error({ updateErr }, `[WPR] failed to record FAILED status for delivery ${deliveryId}`));
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runWprWeekly(opts: RunWprWeeklyOptions = {}): Promise<RunWprWeeklySummary> {
  const zone = WPR_TIMEZONE;
  const now = opts.date ?? new Date();
  const mode: WprJobMode = resolveEmailMode(opts.mode, process.env.WPR_EMAIL_MODE);
  const maxProjects = Number(process.env.WPR_MAX_PROJECTS_PER_RUN) || 50;

  const { nowIso, weekday, weekEnding, weekEndingIso } = resolveRunContext(now, zone);

  logger.info(`[WPR] run starting: date=${nowIso} weekday=${weekday} weekEnding=${weekEndingIso} mode=${mode}`);

  const fabricators = await prisma.fabricator.findMany({
    where: {
      wprDay: weekday,
      isDeleted: false,
      ...(opts.fabricatorId ? { id: opts.fabricatorId } : {}),
    },
    select: { id: true, fabName: true },
  });

  let sent = 0;
  let skipped = 0;
  let skippedNoClientPM = 0;
  let failed = 0;
  let projectsConsidered = 0;

  outer: for (const fabricator of fabricators) {
    const projects = await prisma.project.findMany({
      where: { fabricatorID: fabricator.id, status: "ACTIVE", isDeleted: false },
      select: { id: true, name: true },
    });

    for (const project of projects) {
      if (projectsConsidered >= maxProjects) break outer;
      projectsConsidered++;

      try {
        const claim = await claimDelivery(project.id, fabricator.id, weekEnding, mode as WprDeliveryMode);
        if (!claim) {
          skipped++;
          continue;
        }

        const outcome = await processProject(claim.deliveryId, project, fabricator, weekEnding, weekEndingIso, mode);
        if (outcome === "sent") sent++;
        else if (outcome === "skipped-no-recipients") {
          skipped++;
          skippedNoClientPM++;
        }
      } catch (err) {
        failed++;
        logger.error({ err, projectId: project.id, fabricatorId: fabricator.id }, "[WPR] project delivery failed");
      }
    }
  }

  const rssMb = process.memoryUsage().rss / (1024 * 1024);
  const summary: RunWprWeeklySummary = {
    date: nowIso,
    weekday,
    weekEnding: weekEndingIso,
    fabricators: fabricators.length,
    projectsConsidered,
    sent,
    skipped,
    skippedNoClientPM,
    failed,
    rssMb,
  };

  logger.info(
    `[WPR] run complete: date=${summary.date} weekday=${summary.weekday} fabricators=${summary.fabricators} ` +
      `projects=${summary.projectsConsidered} sent=${summary.sent} skipped=${summary.skipped} ` +
      `skippedNoClientPM=${summary.skippedNoClientPM} failed=${summary.failed} rss=${summary.rssMb.toFixed(1)}MB`
  );

  return summary;
}
