import { AppError } from "../../config/utils/AppError";
import prisma from "../../config/database/client";
import { paginate, PaginatedResult } from "../../utils/pagination";
import { WprDeliveriesQuery } from "./wpr.dto";
import {
  buildProjectWeeks,
  snapToWeekEndingSunday,
  currentWeekEnding,
  formatIsoDate,
  WPR_TIMEZONE,
  ReportWeek,
} from "./wpr.weeks";
import {
  buildRfiRows,
  buildScheduleRows,
  buildCoRows,
  buildDisplayCoRows,
  filterRfis,
  filterScheduleRows,
  filterCoRows,
} from "./wpr.transform";
import { WprAssembledReport, WprReportMeta, generateWprPdf, buildWprFilename, buildReportMeta } from "./wpr.pdf";
import { loadReportInputs, getProjectOr404, canAccessProject, WprRequestUser } from "./wpr.repository";

// ---------------------------------------------------------------------------
// Concurrency guard — one PDF generation at a time per process (this backend
// has had PM2 memory-restart incidents; jsPDF/autoTable builds a full
// document tree in memory, so we never let more than one run concurrently).
// ---------------------------------------------------------------------------

class Semaphore {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(timeoutMs: number): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.queue = this.queue.filter((w) => w !== onTurn);
        reject(new AppError("Another WPR report is currently generating. Please try again shortly.", 429));
      }, timeoutMs);

      const onTurn = () => {
        clearTimeout(timer);
        this.locked = true;
        resolve(() => this.release());
      };
      this.queue.push(onTurn);
    });
  }

  private release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

const pdfSemaphore = new Semaphore();
const GENERATION_WAIT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

export async function assertProjectAccess(projectId: string, user: WprRequestUser) {
  const project = await getProjectOr404(projectId);
  const allowed = await canAccessProject(user, project);
  if (!allowed) {
    throw new AppError("You do not have access to this project's WPR", 403);
  }
  return project;
}

// ---------------------------------------------------------------------------
// GET /projects/:projectId/weeks
// ---------------------------------------------------------------------------

export async function getProjectWeeks(projectId: string, user: WprRequestUser): Promise<ReportWeek[]> {
  const project = await assertProjectAccess(projectId, user);
  return buildProjectWeeks(project, WPR_TIMEZONE);
}

// ---------------------------------------------------------------------------
// Shared: resolve the requested week and assemble the report object
// ---------------------------------------------------------------------------

function resolveWeekEnding(weekEndingParam?: string): Date {
  if (!weekEndingParam) return currentWeekEnding(WPR_TIMEZONE);
  return snapToWeekEndingSunday(weekEndingParam, WPR_TIMEZONE);
}

interface AssembleResult {
  report: WprAssembledReport;
  weekEnding: Date;
  rowCounts: { rfi: number; schedule: number; changeOrders: number };
}

async function assembleReport(projectId: string, user: WprRequestUser, weekEndingParam?: string): Promise<AssembleResult> {
  await assertProjectAccess(projectId, user);

  const inputs = await loadReportInputs(projectId, user);
  const { project, rfiData, submittalData, milestoneData, changeOrderData, bfaCache, circulatedTo } = inputs;

  const weekEnding = resolveWeekEnding(weekEndingParam);
  const zone = WPR_TIMEZONE;

  const rawRfis = buildRfiRows(rfiData, zone);
  const rawScheduleRows = buildScheduleRows(milestoneData, submittalData, project, bfaCache, zone);
  const rawCoRows = buildCoRows(changeOrderData);

  const filteredRfis = filterRfis(rawRfis, weekEnding);
  const filteredScheduleRows = filterScheduleRows(rawScheduleRows, weekEnding);
  const filteredCoRows = filterCoRows(rawCoRows, weekEnding);
  const displayCoRows = buildDisplayCoRows(filteredCoRows);

  const meta: WprReportMeta = buildReportMeta(project, weekEnding, circulatedTo, zone);

  const report: WprAssembledReport = {
    meta,
    rfi: filteredRfis,
    schedule: filteredScheduleRows,
    changeOrders: displayCoRows,
  };

  return {
    report,
    weekEnding,
    rowCounts: { rfi: filteredRfis.length, schedule: filteredScheduleRows.length, changeOrders: filteredCoRows.length },
  };
}

// ---------------------------------------------------------------------------
// GET /projects/:projectId/report.json
// ---------------------------------------------------------------------------

export async function getReportJson(projectId: string, user: WprRequestUser, weekEndingParam?: string): Promise<WprAssembledReport> {
  const { report } = await assembleReport(projectId, user, weekEndingParam);
  return report;
}

// ---------------------------------------------------------------------------
// GET /projects/:projectId/report.pdf
// ---------------------------------------------------------------------------

export interface WprPdfResult {
  buffer: Buffer;
  filename: string;
}

export async function getReportPdf(projectId: string, user: WprRequestUser, weekEndingParam?: string): Promise<WprPdfResult> {
  const release = await pdfSemaphore.acquire(GENERATION_WAIT_TIMEOUT_MS);
  const startedAt = Date.now();
  const rssBefore = process.memoryUsage().rss / (1024 * 1024);

  try {
    const { report, weekEnding, rowCounts } = await assembleReport(projectId, user, weekEndingParam);
    const weekEndingIso = formatIsoDate(weekEnding, WPR_TIMEZONE);

    let buffer: Buffer;
    try {
      buffer = generateWprPdf(report);
    } finally {
      // Nothing to cache/hold onto — `report` and any intermediate rows go out of scope here.
    }

    const filename = buildWprFilename(report.meta.projectName, weekEndingIso);
    const ms = Date.now() - startedAt;
    const rssAfter = process.memoryUsage().rss / (1024 * 1024);

    console.log(
      `[WPR] project=${projectId} weekEnding=${weekEndingIso} ms=${ms} ` +
        `rfi=${rowCounts.rfi} schedule=${rowCounts.schedule} co=${rowCounts.changeOrders} ` +
        `rssBefore=${rssBefore.toFixed(1)}MB rssAfter=${rssAfter.toFixed(1)}MB`
    );

    return { buffer, filename };
  } finally {
    release();
  }
}

// ---------------------------------------------------------------------------
// GET /deliveries — audit trail. Metadata only, never file contents.
// ---------------------------------------------------------------------------

export async function listDeliveries(query: WprDeliveriesQuery): Promise<PaginatedResult<any>> {
  const where: any = {};
  if (query.fabricatorId) where.fabricatorId = query.fabricatorId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;

  return paginate(
    prisma.wprDelivery,
    {
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectId: true,
        fabricatorId: true,
        weekEnding: true,
        mode: true,
        status: true,
        recipients: true,
        filePath: true,
        attempts: true,
        error: true,
        createdAt: true,
        sentAt: true,
      },
    },
    { page: query.page, limit: query.limit }
  );
}
