import prisma from "../config/database/client";

type NotificationPayload = Record<string, any>;

const ENTITY_TYPE_PATTERNS: Array<{ entityType: string; matcher: RegExp }> = [
  { entityType: "submittal", matcher: /submittal/i },
  { entityType: "rfi", matcher: /(^|_)rfi($|_)/i },
  { entityType: "rfq", matcher: /(^|_)rfq($|_)/i },
  { entityType: "change_order", matcher: /(^|_)co($|_)|change[_\s-]?order/i },
  { entityType: "milestone", matcher: /mile[_\s-]?stone|milestone/i },
  { entityType: "design_drawing", matcher: /design[_\s-]?drawing/i },
  { entityType: "task", matcher: /task/i },
  { entityType: "project", matcher: /project/i },
  { entityType: "meeting", matcher: /meeting/i },
  { entityType: "team_meeting_note", matcher: /team[_\s-]?meeting[_\s-]?note|note[_\s-]?response/i },
  { entityType: "communication", matcher: /client[_\s-]?comm|communication|followup/i },
  { entityType: "invoice", matcher: /invoice/i },
  { entityType: "department", matcher: /department/i },
  { entityType: "fabricator", matcher: /fabricator/i },
  { entityType: "team", matcher: /team/i },
  { entityType: "user", matcher: /user|employee/i },
];

function resolveProjectId(payload: NotificationPayload): string | undefined {
  const projectId = payload.projectId ?? payload.project_id ?? payload.project;
  return typeof projectId === "string" && projectId.trim() ? projectId : undefined;
}

function messageAlreadyMentionsProject(message: string, projectName: string): boolean {
  const normalizedMessage = message.toLowerCase();
  const normalizedProjectName = projectName.toLowerCase();

  return (
    normalizedMessage.includes(normalizedProjectName) ||
    normalizedMessage.includes(`project: ${normalizedProjectName}`) ||
    normalizedMessage.includes(`project '${normalizedProjectName}'`) ||
    normalizedMessage.includes(`project "${normalizedProjectName}"`)
  );
}

function appendProjectToMessage(message: string | undefined, projectName: string): string {
  const baseMessage = typeof message === "string" && message.trim()
    ? message.trim()
    : `Project: ${projectName}`;

  if (messageAlreadyMentionsProject(baseMessage, projectName)) {
    return baseMessage;
  }

  return `${baseMessage} (Project: ${projectName})`;
}

function inferEntityType(payload: NotificationPayload): string | undefined {
  const candidates = [
    payload.actionType,
    payload.type,
    payload.title,
    payload.submittalId && "submittal",
    payload.submittalsId && "submittal",
    payload.rfiId && "rfi",
    payload.rfqId && "rfq",
    payload.coId && "change_order",
    payload.changeOrderId && "change_order",
    payload.mileStoneId && "milestone",
    payload.milestoneId && "milestone",
    payload.taskId && "task",
    payload.meetingId && "meeting",
    payload.noteId && "team_meeting_note",
    payload.invoiceId && "invoice",
    payload.projectId && "project",
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.trim();
    for (const { entityType, matcher } of ENTITY_TYPE_PATTERNS) {
      if (matcher.test(normalizedCandidate)) {
        return entityType;
      }
    }
  }

  return undefined;
}

export async function enrichNotificationPayloadWithProject(
  payload: NotificationPayload
): Promise<NotificationPayload> {
  if (!payload || typeof payload !== "object") return payload;

  const projectId = resolveProjectId(payload);
  const existingProjectName =
    typeof payload.projectName === "string" && payload.projectName.trim()
      ? payload.projectName.trim()
      : undefined;

  if (!projectId && !existingProjectName) {
    return payload;
  }

  let projectName = existingProjectName;

  if (!projectName && projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    projectName = project?.name?.trim();
  }

  if (!projectName) {
    const inferredEntityType = inferEntityType(payload);

    if (!inferredEntityType || payload.type === inferredEntityType) {
      return payload;
    }

    return {
      ...payload,
      actionType: payload.actionType ?? payload.type,
      type: inferredEntityType,
    };
  }

  const inferredEntityType = inferEntityType(payload);

  return {
    ...payload,
    ...(projectId ? { projectId } : {}),
    projectName,
    ...(inferredEntityType
      ? {
          actionType: payload.actionType ?? payload.type,
          type: inferredEntityType,
        }
      : {}),
    message: appendProjectToMessage(payload.message, projectName),
  };
}
