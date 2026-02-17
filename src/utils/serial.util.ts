import { Prisma } from "@prisma/client";
import { AppError } from "../config/utils/AppError";

const PAD = 6;

type SerialScopeType = "GLOBAL" | "PROJECT" | "PARENT";

type NextSequenceInput = {
  tx: Prisma.TransactionClient;
  scopeType: SerialScopeType;
  scopeId: string;
  entity: string;
};

export const SERIAL_PREFIX = {
  PROJECT: "PRJ",
  RFQ: "RFQ",
  CONNECTION_DESIGNER_QUOTA: "CDQ",
  VENDOR_QUOTA: "VQ",
  NOTES: "NTS",
  MILESTONE: "MLS",
  TASK: "TSK",
  ESTIMATION: "EST",
  ESTIMATION_TASK: "ETK",
  RFI: "RFI",
  SUBMITTAL: "SUB",
  CHANGE_ORDER: "CO",
  DESIGN_DRAWING: "DD",
  INVOICE: "INV",
} as const;

function pad6(value: number): string {
  return String(value).padStart(PAD, "0");
}

function normalizeProjectToken(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "PRJ000000";
  return cleaned.slice(0, 24);
}

function getYear(date = new Date()): number {
  return date.getUTCFullYear();
}

async function nextSequence(input: NextSequenceInput): Promise<number> {
  const counter = await input.tx.serialCounter.upsert({
    where: {
      scopeType_scopeId_entity: {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        entity: input.entity,
      },
    },
    update: {
      lastValue: { increment: 1 },
    },
    create: {
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      entity: input.entity,
      lastValue: 1,
    },
  });

  return counter.lastValue;
}

function extractLastSequence(serialNo: string): string {
  const match = serialNo.match(/-(\d{6})$/);
  if (!match) {
    throw new AppError(`Invalid serial format: ${serialNo}`, 400);
  }
  return match[1];
}

export function extractProjectToken(serialNo: string): string {
  const parts = serialNo.split("-");
  if (parts.length < 4) {
    throw new AppError(`Invalid serial format: ${serialNo}`, 400);
  }
  return parts[1];
}

export async function generateProjectSerial(
  tx: Prisma.TransactionClient,
  date = new Date()
) {
  const sequence = await nextSequence({
    tx,
    scopeType: "GLOBAL",
    scopeId: "GLOBAL",
    entity: SERIAL_PREFIX.PROJECT,
  });

  const seq6 = pad6(sequence);
  const year = getYear(date);

  return {
    serialNo: `${SERIAL_PREFIX.PROJECT}-${year}-${seq6}`,
    projectCode: `${SERIAL_PREFIX.PROJECT}${seq6}`,
  };
}

export async function generateProjectScopedSerial(
  tx: Prisma.TransactionClient,
  args: {
    prefix: string;
    projectScopeId: string;
    projectToken: string;
    date?: Date;
  }
) {
  const sequence = await nextSequence({
    tx,
    scopeType: "PROJECT",
    scopeId: args.projectScopeId,
    entity: args.prefix,
  });

  const seq6 = pad6(sequence);
  const year = getYear(args.date);
  const projectToken = normalizeProjectToken(args.projectToken);
  return `${args.prefix}-${projectToken}-${year}-${seq6}`;
}

export async function generateParentScopedSerial(
  tx: Prisma.TransactionClient,
  args: {
    childPrefix: string;
    parentPrefix: string;
    parentScopeId: string;
    parentSerialNo: string;
    projectToken: string;
    date?: Date;
  }
) {
  const sequence = await nextSequence({
    tx,
    scopeType: "PARENT",
    scopeId: args.parentScopeId,
    entity: args.childPrefix,
  });

  const seq6 = pad6(sequence);
  const year = getYear(args.date);
  const parentSeq = extractLastSequence(args.parentSerialNo);
  const projectToken = normalizeProjectToken(args.projectToken);
  return `${args.childPrefix}-${projectToken}-${args.parentPrefix}${parentSeq}-${year}-${seq6}`;
}
