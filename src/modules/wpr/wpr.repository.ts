import prisma from "../../config/database/client";
import { UserRole } from "@prisma/client";
import { AppError } from "../../config/utils/AppError";
import { NotFoundError } from "../../utils/errors";

import { RFIService } from "../RFI";
import { SubmittalService } from "../submittals";
import { MileStoneService } from "../milestone";
import { COService } from "../CO";
import { BfaService } from "../bfa";
import { FabricatorService } from "../fabricator";
import { ClientService } from "../client";
import { RFQService } from "../RFQ";

import { BfaCache, joinNames, formatCirculatedName, submittalsNeedingBfaLookup } from "./wpr.transform";

const rfiService = new RFIService();
const submittalService = new SubmittalService();
const mileStoneService = new MileStoneService();
const coService = new COService();
const bfaService = new BfaService();
const fabService = new FabricatorService();
const clientService = new ClientService();
const rfqService = new RFQService();

export interface WprRequestUser {
  id: string;
  role: string;
  departmentId?: string | null;
}

/**
 * Roles allowed to reach a WPR at all, and how each is scoped. Mirrors the
 * spec in wpr.routes.ts — kept here too since the fabricator/project-manager
 * checks need a DB query.
 */
const ANY_PROJECT_ROLES = ["ADMIN", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER", "DEPUTY_MANAGER"];
const CLIENT_FAMILY_ROLES = ["CLIENT", "CLIENT_ADMIN", "CLIENT_ESTIMATOR", "CLIENT_ACCOUNTANT"];

// ---------------------------------------------------------------------------
// Project + authorization
// ---------------------------------------------------------------------------

/**
 * Minimal project projection for the report meta block — deliberately NOT
 * `projectRepository.get()` (that function's include tree pulls in
 * submittals, design drawings, coordination drawings, client communications,
 * etc. across the whole project — far more than a report needs, and exactly
 * the kind of unscoped over-fetch item 7 asks us to avoid). This is the one
 * place this module writes its own query instead of reusing an existing
 * one — documented per the task's item 10e.
 */
export async function getProjectForReport(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      status: true,
      isDeleted: true,
      startDate: true,
      endDate: true,
      approvalDate: true,
      fabricationDate: true,
      tools: true,
      rfqId: true,
      fabricatorID: true,
      managerID: true,
      departmentID: true,
      fabricator: { select: { id: true, fabName: true } },
      manager: { select: { id: true, firstName: true, middleName: true, lastName: true } },
      clientProjectManagers: { select: { id: true, firstName: true, middleName: true, lastName: true } },
    },
  });
}

export async function getProjectOr404(projectId: string) {
  const project = await getProjectForReport(projectId);
  if (!project || project.isDeleted) {
    throw new AppError("Project not found", 404);
  }
  return project;
}

/** Same fabricator/project-manager scope rules used by other project & RFQ routes (see wpr_audit §8). */
export async function canAccessProject(
  user: WprRequestUser,
  project: { id: string; managerID: string; departmentID: string; fabricatorID: string }
): Promise<boolean> {
  const role = user.role;

  if (ANY_PROJECT_ROLES.includes(role)) return true;

  if (role === "PROJECT_MANAGER") return project.managerID === user.id;

  if (role === "DEPT_MANAGER") return !!user.departmentId && project.departmentID === user.departmentId;

  if (CLIENT_FAMILY_ROLES.includes(role)) {
    const [fabMatch, pmMatch] = await Promise.all([
      prisma.fabricator.count({
        where: { id: project.fabricatorID, pointOfContact: { some: { id: user.id } } },
      }),
      prisma.project.count({
        where: { id: project.id, clientProjectManagers: { some: { id: user.id } } },
      }),
    ]);
    return fabMatch > 0 || pmMatch > 0;
  }

  return false;
}

// ---------------------------------------------------------------------------
// RFI — mirrors the FE's fetchRfiForProject (GetProjectById.tsx:174-229)
// ---------------------------------------------------------------------------

export async function getRfiData(projectId: string, user: WprRequestUser): Promise<any[]> {
  if (CLIENT_FAMILY_ROLES.includes(user.role)) {
    const [receivedRes, sentRes] = await Promise.all([
      rfiService.received(user.id, projectId, user.role as UserRole),
      rfiService.sent(user.id, projectId, user.role as UserRole),
    ]);
    const received = Array.isArray(receivedRes) ? receivedRes : [];
    const sent = Array.isArray(sentRes) ? sentRes : [];
    const combined = [...received, ...sent];
    return Array.from(new Map(combined.map((item: any) => [item.id, item])).values());
  }
  const rfis = await rfiService.findByProject(projectId, user.role as UserRole);
  return Array.isArray(rfis) ? rfis : [];
}

// ---------------------------------------------------------------------------
// Submittals — mirrors fetchSubmittalsForProject
// ---------------------------------------------------------------------------

export async function getSubmittalData(projectId: string, user: WprRequestUser): Promise<any[]> {
  const submittals = await submittalService.findByProject(projectId, user.role as UserRole);
  return Array.isArray(submittals) ? submittals : [];
}

// ---------------------------------------------------------------------------
// Milestones — mirrors the Redux-cached GetProjectMilestoneById fetch
// ---------------------------------------------------------------------------

export async function getMilestoneData(projectId: string, user: WprRequestUser): Promise<any[]> {
  const milestones = await mileStoneService.getByProjectId(projectId, user);
  return Array.isArray(milestones) ? milestones : [];
}

// ---------------------------------------------------------------------------
// Change orders — mirrors fetchChangeOrderForProject + handleGetByProjectId's
// role filter (co.controller.ts:339-341). The FE calls GetChangeOrder twice
// (once unused, in the parent); this collapses to a single call.
// ---------------------------------------------------------------------------

export async function getChangeOrderData(projectId: string, user: WprRequestUser): Promise<any[]> {
  let cos: any[];
  try {
    cos = await coService.getByProjectId(projectId);
  } catch (err) {
    if (err instanceof NotFoundError) return []; // no COs for this project is normal, not an error
    throw err;
  }
  if (user.role === "CLIENT" || user.role === "CLIENT_ADMIN") {
    cos = cos.filter((co: any) => co.isAproovedByAdmin === true);
  }
  return cos;
}

// ---------------------------------------------------------------------------
// BFA lookups — only for submittals with bfaStatus===true && status==="BFA_SENT",
// fetched in bounded batches of 5 (never the FE's unbounded Promise.all).
// ---------------------------------------------------------------------------

export async function buildBfaCache(submittalData: any[]): Promise<BfaCache> {
  const targets = submittalsNeedingBfaLookup(submittalData);
  const cache: BfaCache = {};
  const BATCH_SIZE = 5;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (sub: any) => {
        const key = String(sub.id || sub._id);
        try {
          const bfa = await bfaService.getBfaBySubmittalId(key);
          return { key, bfa };
        } catch (err) {
          if (err instanceof NotFoundError) return null; // no BFA row created yet — matches FE's catch-and-skip
          throw err;
        }
      })
    );
    for (const r of results) {
      if (r) cache[r.key] = { status: r.bfa?.status ?? null, createdAt: r.bfa?.createdAt ?? null };
    }
  }

  return cache;
}

// ---------------------------------------------------------------------------
// Circulated-to fields — mirrors fetchFabricatorPOCs (WorkProgressReport.tsx:182-243)
// ---------------------------------------------------------------------------

async function resolveFabricatorId(project: any, user: WprRequestUser): Promise<string | null> {
  let fabId: string | null = project.fabricatorID || project.fabricator?.id || null;

  if (project.rfqId) {
    try {
      const rfq = await rfqService.getRfqById({ id: project.rfqId }, user as any);
      const rfqFab = (rfq as any)?.sender?.fabricator || (rfq as any)?.fabricator;
      if (rfqFab?.id) fabId = rfqFab.id;
    } catch {
      // Matches the FE's try/catch-and-continue — a missing/inaccessible RFQ never blocks the report.
    }
  }

  return fabId;
}

export interface CirculatedToFields {
  wbtCirculatedTo: string;
  fabCirculatedTo: string;
  fabProjectManager: string;
}

export async function getCirculatedToFields(project: any, user: WprRequestUser): Promise<CirculatedToFields> {
  let fabProjectManager =
    project?.clientProjectManagers?.length > 0 ? joinNames(project.clientProjectManagers) : "MATT AURAND"; // FE hardcoded fallback, ported verbatim
  let wbtCirculatedTo = "";
  let fabCirculatedTo = "";

  const fabId = await resolveFabricatorId(project, user);
  if (!fabId) return { wbtCirculatedTo, fabCirculatedTo, fabProjectManager };

  const [fab, clientAdminsRaw] = await Promise.all([
    fabService.getFabricatorById(fabId).catch(() => null),
    clientService.getAllClinetByFabricatorId(fabId).catch(() => []),
  ]);

  const clientAdmins = (clientAdminsRaw || []).filter(
    (c: any) => c.role === "CLIENT_ADMIN" || c.role === "client_admin"
  );

  if (fab) {
    const wbtPOCs: any[] = (fab as any).wbtFabricatorPointOfContact || [];
    const fabPOCs: any[] = (fab as any).pointOfContact || [];

    // TODO(parity): the FE only ever reads wbtPOCs[0], silently dropping any
    // additional WBT points of contact even though the fetch returns all of
    // them. Ported as-is for Phase 1 — revisit if "circulated to" should
    // list every WBT POC once this becomes a client-facing automated email.
    if (wbtPOCs.length > 0) wbtCirculatedTo = formatCirculatedName(wbtPOCs[0]);

    if (project?.clientProjectManagers?.length > 0) {
      fabProjectManager = joinNames(project.clientProjectManagers);
    } else if (fabPOCs.length > 0) {
      fabProjectManager = joinNames(fabPOCs);
    }
  }

  if (clientAdmins.length > 0) fabCirculatedTo = joinNames(clientAdmins);

  return { wbtCirculatedTo, fabCirculatedTo, fabProjectManager };
}

// ---------------------------------------------------------------------------
// Bundle loader
// ---------------------------------------------------------------------------

export interface WprReportInputs {
  project: NonNullable<Awaited<ReturnType<typeof getProjectForReport>>>;
  rfiData: any[];
  submittalData: any[];
  milestoneData: any[];
  changeOrderData: any[];
  bfaCache: BfaCache;
  circulatedTo: CirculatedToFields;
}

/** Loads everything the report needs, scoped to this one project only. */
export async function loadReportInputs(projectId: string, user: WprRequestUser): Promise<WprReportInputs> {
  const project = await getProjectOr404(projectId);

  const [rfiData, submittalData, milestoneData, changeOrderData] = await Promise.all([
    getRfiData(projectId, user),
    getSubmittalData(projectId, user),
    getMilestoneData(projectId, user),
    getChangeOrderData(projectId, user),
  ]);

  const [bfaCache, circulatedTo] = await Promise.all([
    buildBfaCache(submittalData),
    getCirculatedToFields(project, user),
  ]);

  return { project, rfiData, submittalData, milestoneData, changeOrderData, bfaCache, circulatedTo };
}
