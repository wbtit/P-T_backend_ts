import prisma from "../config/database/client";
import { sendNotification } from "./sendNotification";

type NotificationPayload = Record<string, any>;
type NotifyOptions = {
  excludeUserIds?: string[];
};

type MtoRfqShape = {
  MTOManual?: boolean | null;
  isMTOStickModel?: boolean | null;
  MTOValue?: string | null;
  MTOStickModel?: string | null;
};

function hasText(value?: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isMtoRfq(rfq?: MtoRfqShape | null): boolean {
  if (!rfq) return false;

  return Boolean(
    rfq.MTOManual ||
      rfq.isMTOStickModel ||
      hasText(rfq.MTOValue) ||
      hasText(rfq.MTOStickModel)
  );
}

async function getClientEstimatorIdsForFabricator(fabricatorId?: string | null): Promise<string[]> {
  if (!fabricatorId) return [];

  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT_ESTIMATOR",
      isActive: true,
      OR: [
        { FabricatorPointOfContacts: { some: { id: fabricatorId } } },
        { wbtFabricatorPointOfContact: { some: { id: fabricatorId } } },
      ],
    },
    select: { id: true },
  });

  return users.map((user) => user.id);
}

async function notifyUsers(userIds: string[], payload: NotificationPayload, options: NotifyOptions = {}) {
  const excludedUserIds = new Set((options.excludeUserIds || []).filter(Boolean));
  const recipientIds = Array.from(new Set(userIds)).filter((id) => !excludedUserIds.has(id));

  if (!recipientIds.length) return;

  await Promise.all(recipientIds.map((userId) => sendNotification(userId, payload)));
}

export async function notifyMtoClientEstimatorsForRfq(
  rfqId: string,
  payload: NotificationPayload,
  options: NotifyOptions = {}
): Promise<void> {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    select: {
      id: true,
      fabricatorId: true,
      MTOManual: true,
      isMTOStickModel: true,
      MTOValue: true,
      MTOStickModel: true,
    },
  });

  if (!isMtoRfq(rfq)) return;

  const recipientIds = await getClientEstimatorIdsForFabricator(rfq?.fabricatorId);
  await notifyUsers(recipientIds, payload, options);
}

export async function notifyMtoClientEstimatorsForInvoice(
  invoiceId: string,
  payload: NotificationPayload,
  options: NotifyOptions = {}
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      fabricatorId: true,
      rfq: {
        select: {
          id: true,
          MTOManual: true,
          isMTOStickModel: true,
          MTOValue: true,
          MTOStickModel: true,
        },
      },
    },
  });

  if (!invoice?.rfq || !isMtoRfq(invoice.rfq)) return;

  const recipientIds = await getClientEstimatorIdsForFabricator(invoice.fabricatorId);
  await notifyUsers(recipientIds, payload, options);
}

export async function notifyMtoClientEstimatorsForRfqStatus(
  rfqId: string,
  status: string,
  subject: string,
  options: NotifyOptions = {}
): Promise<void> {
  const normalizedStatus = status.toUpperCase();

  const statusMap: Record<string, { title: string; message: string }> = {
    CLOSED: {
      title: "MTO RFQ Closed",
      message: `MTO RFQ '${subject}' was closed.`,
    },
    AWARDED: {
      title: "MTO RFQ Awarded",
      message: `MTO RFQ '${subject}' was awarded.`,
    },
    REJECTED: {
      title: "MTO RFQ Rejected",
      message: `MTO RFQ '${subject}' was rejected.`,
    },
  };

  const template = statusMap[normalizedStatus];
  if (!template) return;

  await notifyMtoClientEstimatorsForRfq(
    rfqId,
    {
      type: "RFQ_STATUS_UPDATED",
      title: template.title,
      message: template.message,
      rfqId,
      status: normalizedStatus,
      timestamp: new Date(),
    },
    options
  );
}
