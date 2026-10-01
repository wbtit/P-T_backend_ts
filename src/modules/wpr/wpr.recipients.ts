import prisma from "../../config/database/client";

/**
 * WPR/WBR recipient resolution — one function, deliberately dumb, so the
 * rule ("who gets this email") can change without touching the job that
 * sends it.
 *
 *   To: Project.clientProjectManagers ONLY (can be several). Nothing else.
 *   CC: every active ADMIN / OPERATION_EXECUTIVE / PROJECT_MANAGER_OFFICER
 *       user, plus active DEPT_MANAGER users whose departmentId equals the
 *       project's department (Project.departmentID). DEPT_MANAGERs of other
 *       departments are never included.
 *
 * Only active users with a non-empty email, de-duplicated case-insensitively.
 * A CC address never also appears in To.
 */

export interface ResolvedWprRecipients {
  to: string[];
  cc: string[];
}

interface EmailBearer {
  email: string | null;
  isActive: boolean;
}

const normalize = (email: string): string => email.trim().toLowerCase();

function activeEmails(users: EmailBearer[]): string[] {
  return users
    .filter((u) => !!u.email && u.email.trim().length > 0 && u.isActive)
    .map((u) => normalize(u.email as string));
}

/**
 * Pure: given the raw contact lists, produce the deduplicated To/CC address
 * lists. No DB access — resolveWprRecipients below is the thin I/O wrapper
 * that fetches these lists (already role/department-scoped) and calls this.
 */
export function aggregateRecipients(input: {
  clientProjectManagers: EmailBearer[];
  globalCcUsers: EmailBearer[]; // ADMIN / OPERATION_EXECUTIVE / PROJECT_MANAGER_OFFICER, any department
  departmentManagers: EmailBearer[]; // DEPT_MANAGER, already filtered to the project's department
}): ResolvedWprRecipients {
  const toSet = new Set<string>(activeEmails(input.clientProjectManagers));

  const ccSet = new Set<string>([...activeEmails(input.globalCcUsers), ...activeEmails(input.departmentManagers)]);
  for (const email of toSet) ccSet.delete(email); // CC never duplicates a To recipient

  return { to: Array.from(toSet), cc: Array.from(ccSet) };
}

const GLOBAL_CC_ROLES = ["ADMIN", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER"] as const;

/**
 * `fabricatorId` is accepted (and ignored) only so the call site in
 * wprWeekly.ts — resolveWprRecipients(project.id, fabricator.id) — needs no
 * change under the new rules, which no longer involve the fabricator at all.
 */
export async function resolveWprRecipients(projectId: string, fabricatorId: string): Promise<ResolvedWprRecipients> {
  const [project, globalCcUsers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        departmentID: true,
        clientProjectManagers: { select: { email: true, isActive: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [...GLOBAL_CC_ROLES] }, isActive: true },
      select: { email: true, isActive: true },
    }),
  ]);

  const departmentManagers = project?.departmentID
    ? await prisma.user.findMany({
        where: { role: "DEPT_MANAGER", isActive: true, departmentId: project.departmentID },
        select: { email: true, isActive: true },
      })
    : [];

  return aggregateRecipients({
    clientProjectManagers: project?.clientProjectManagers || [],
    globalCcUsers,
    departmentManagers,
  });
}
