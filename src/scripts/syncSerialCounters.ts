import prisma from "../config/database/client";
import { SERIAL_PREFIX } from "../utils/serial.util";

type ScopeType = "GLOBAL" | "PROJECT" | "PARENT";

type CounterKey = {
  scopeType: ScopeType;
  scopeId: string;
  entity: string;
};

const SEQ_REGEX = /-(\d{6})$/;

function extractSeq(serialNo?: string | null): number | null {
  if (!serialNo) return null;
  const match = serialNo.match(SEQ_REGEX);
  if (!match) return null;
  return Number(match[1]);
}

function upsertMax(
  map: Map<string, number>,
  key: CounterKey,
  seq: number | null
) {
  if (seq == null || Number.isNaN(seq)) return;
  const mapKey = `${key.scopeType}|${key.scopeId}|${key.entity}`;
  const existing = map.get(mapKey) ?? 0;
  if (seq > existing) map.set(mapKey, seq);
}

function parseMapKey(key: string): CounterKey {
  const [scopeType, scopeId, entity] = key.split("|");
  return {
    scopeType: scopeType as ScopeType,
    scopeId,
    entity,
  };
}

async function collectCounters() {
  const counters = new Map<string, number>();

  // GLOBAL: Project
  const projects = await prisma.project.findMany({
    select: { serialNo: true },
  });
  for (const row of projects) {
    upsertMax(
      counters,
      { scopeType: "GLOBAL", scopeId: "GLOBAL", entity: SERIAL_PREFIX.PROJECT },
      extractSeq(row.serialNo)
    );
  }

  // PROJECT: direct project-bound entities
  const notes = await prisma.notes.findMany({
    select: { serialNo: true, projectId: true },
  });
  for (const row of notes) {
    upsertMax(
      counters,
      { scopeType: "PROJECT", scopeId: row.projectId, entity: SERIAL_PREFIX.NOTES },
      extractSeq(row.serialNo)
    );
  }

  const milestones = await prisma.mileStone.findMany({
    select: { serialNo: true, project_id: true },
  });
  for (const row of milestones) {
    upsertMax(
      counters,
      {
        scopeType: "PROJECT",
        scopeId: row.project_id,
        entity: SERIAL_PREFIX.MILESTONE,
      },
      extractSeq(row.serialNo)
    );
  }

  const tasks = await prisma.task.findMany({
    select: { serialNo: true, project_id: true },
  });
  for (const row of tasks) {
    upsertMax(
      counters,
      { scopeType: "PROJECT", scopeId: row.project_id, entity: SERIAL_PREFIX.TASK },
      extractSeq(row.serialNo)
    );
  }

  const rfis = await prisma.rFI.findMany({
    select: { serialNo: true, project_id: true },
  });
  for (const row of rfis) {
    upsertMax(
      counters,
      { scopeType: "PROJECT", scopeId: row.project_id, entity: SERIAL_PREFIX.RFI },
      extractSeq(row.serialNo)
    );
  }

  const submittals = await prisma.submittals.findMany({
    select: { serialNo: true, project_id: true },
  });
  for (const row of submittals) {
    upsertMax(
      counters,
      {
        scopeType: "PROJECT",
        scopeId: row.project_id,
        entity: SERIAL_PREFIX.SUBMITTAL,
      },
      extractSeq(row.serialNo)
    );
  }

  const changeOrders = await prisma.changeOrder.findMany({
    select: { serialNo: true, project: true },
  });
  for (const row of changeOrders) {
    upsertMax(
      counters,
      {
        scopeType: "PROJECT",
        scopeId: row.project,
        entity: SERIAL_PREFIX.CHANGE_ORDER,
      },
      extractSeq(row.serialNo)
    );
  }

  const drawings = await prisma.designDrawings.findMany({
    select: { serialNo: true, projectId: true },
  });
  for (const row of drawings) {
    upsertMax(
      counters,
      {
        scopeType: "PROJECT",
        scopeId: row.projectId,
        entity: SERIAL_PREFIX.DESIGN_DRAWING,
      },
      extractSeq(row.serialNo)
    );
  }

  const invoices = await prisma.invoice.findMany({
    select: { serialNo: true, projectId: true },
  });
  for (const row of invoices) {
    upsertMax(
      counters,
      { scopeType: "PROJECT", scopeId: row.projectId, entity: SERIAL_PREFIX.INVOICE },
      extractSeq(row.serialNo)
    );
  }

  // PROJECT: RFQ (project.id when known, else PROJECT_NUMBER:<N>)
  const rfqs = await prisma.rFQ.findMany({
    select: {
      serialNo: true,
      projectNumber: true,
      project: { select: { id: true } },
    },
  });
  for (const row of rfqs) {
    const scopeId = row.project?.id ?? `PROJECT_NUMBER:${(row.projectNumber ?? "").toUpperCase()}`;
    if (!scopeId || scopeId === "PROJECT_NUMBER:") continue;
    upsertMax(
      counters,
      { scopeType: "PROJECT", scopeId, entity: SERIAL_PREFIX.RFQ },
      extractSeq(row.serialNo)
    );
  }

  // PROJECT: Estimation (same logic as creation service)
  const estimations = await prisma.estimation.findMany({
    select: {
      serialNo: true,
      projectName: true,
      rfq: {
        select: {
          projectNumber: true,
          project: { select: { id: true } },
        },
      },
    },
  });
  for (const row of estimations) {
    let scopeId = `EST_PROJECT:${row.projectName.toUpperCase()}`;
    if (row.rfq?.project?.id) {
      scopeId = row.rfq.project.id;
    } else if (row.rfq?.projectNumber) {
      scopeId = `PROJECT_NUMBER:${row.rfq.projectNumber.toUpperCase()}`;
    }

    upsertMax(
      counters,
      {
        scopeType: "PROJECT",
        scopeId,
        entity: SERIAL_PREFIX.ESTIMATION,
      },
      extractSeq(row.serialNo)
    );
  }

  // PARENT: child entities
  const cdQuotas = await prisma.connectionDesignerQuota.findMany({
    select: { serialNo: true, rfqId: true },
  });
  for (const row of cdQuotas) {
    if (!row.rfqId) continue;
    upsertMax(
      counters,
      {
        scopeType: "PARENT",
        scopeId: row.rfqId,
        entity: SERIAL_PREFIX.CONNECTION_DESIGNER_QUOTA,
      },
      extractSeq(row.serialNo)
    );
  }

  const vendorQuotas = await prisma.vendorQuota.findMany({
    select: { serialNo: true, rfqId: true },
  });
  for (const row of vendorQuotas) {
    if (!row.rfqId) continue;
    upsertMax(
      counters,
      {
        scopeType: "PARENT",
        scopeId: row.rfqId,
        entity: SERIAL_PREFIX.VENDOR_QUOTA,
      },
      extractSeq(row.serialNo)
    );
  }

  const estimationTasks = await prisma.estimationTask.findMany({
    select: { serialNo: true, estimationId: true },
  });
  for (const row of estimationTasks) {
    upsertMax(
      counters,
      {
        scopeType: "PARENT",
        scopeId: row.estimationId,
        entity: SERIAL_PREFIX.ESTIMATION_TASK,
      },
      extractSeq(row.serialNo)
    );
  }

  return counters;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const counters = await collectCounters();
  const entries = [...counters.entries()];

  console.log(
    `Found ${entries.length} serial counter scope(s)${isDryRun ? " [dry-run]" : ""}.`
  );

  for (const [key, lastValue] of entries) {
    const parsed = parseMapKey(key);
    if (isDryRun) {
      console.log(`[DRY] ${parsed.scopeType} | ${parsed.scopeId} | ${parsed.entity} => ${lastValue}`);
      continue;
    }

    await prisma.serialCounter.upsert({
      where: {
        scopeType_scopeId_entity: {
          scopeType: parsed.scopeType,
          scopeId: parsed.scopeId,
          entity: parsed.entity,
        },
      },
      update: {
        lastValue,
      },
      create: {
        scopeType: parsed.scopeType,
        scopeId: parsed.scopeId,
        entity: parsed.entity,
        lastValue,
      },
    });
  }

  console.log(isDryRun ? "Dry-run complete." : "Serial counters synced successfully.");
}

main()
  .catch((err) => {
    console.error("Failed to sync serial counters:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
