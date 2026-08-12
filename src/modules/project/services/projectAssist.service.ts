import { includes } from "zod";
import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { ForbiddenError } from "../../../utils/errors";
import { UserJwt } from "../../../shared/types";

const MAX_ACTIVE_ASSISTS = 2;

type RfiSubmittalAccess = {
  isAssist: boolean;
  projectManagerId: string;
};

const ELEVATED_ROLES = new Set<UserJwt["role"]>([
  "ADMIN",
  "SYSTEM_ADMIN",
  "DEPT_MANAGER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "PROJECT_MANAGER_OFFICER",
  "CONNECTION_DESIGNER_ADMIN",
  "CONNECTION_DESIGNER_ENGINEER",
]);

const prismaWithAssists = prisma as typeof prisma & {
  projectAssist: any;
};

export class ProjectAssistService {
  private async getProjectOrThrow(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        managerID: true,
        teamID: true,
      },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return project;
  }

  private async assertProjectManager(projectId: string, actorId: string) {
    const project = await this.getProjectOrThrow(projectId);
    if (project.managerID !== actorId) {
      throw new ForbiddenError("Only the project manager can manage project assists");
    }
    return project;
  }

  private async ensureProjectTeamMember(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);

    if (!project.teamID) {
      throw new AppError("Project does not have a team assigned", 400);
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: project.teamID,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new AppError("User must be a team member of this project", 400);
    }
  }

  private async assertActiveUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError("User not found or inactive", 404);
    }
  }

  private async assertAssistCapacity(projectId: string, ignoreUserId?: string) {
    const whereClause = ignoreUserId
      ? { projectId, isActive: true, NOT: { userId: ignoreUserId } }
      : { projectId, isActive: true };

    const activeAssistCount = await prismaWithAssists.projectAssist.count({
      where: whereClause,
    });

    if (activeAssistCount >= MAX_ACTIVE_ASSISTS) {
      throw new AppError("Only 2 active assists are allowed per project", 400);
    }
  }

  async createAssist(projectId: string, assistUserId: string, actorId: string, isActive: boolean) {
    const project = await this.assertProjectManager(projectId, actorId);

    if (project.managerID === assistUserId) {
      throw new AppError("Project manager cannot be assigned as assist", 400);
    }

    await this.assertActiveUser(assistUserId);
    await this.ensureProjectTeamMember(projectId, assistUserId);

    const existing = await prismaWithAssists.projectAssist.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assistUserId,
        },
      },
      select: { id: true, isActive: true },
    });

    if (existing?.isActive && isActive) {
      throw new AppError("User is already an active assist for this project", 409);
    }

    if (isActive) {
      await this.assertAssistCapacity(projectId, assistUserId);
    }

    if (existing) {
      return prismaWithAssists.projectAssist.update({
        where: { projectId_userId: { projectId, userId: assistUserId } },
        data: {
          isActive,
          assignedById: actorId,
        },
        include: {
          user: {
            select: { id: true, firstName: true, middleName: true, lastName: true, email: true },
          },
        },
      });
    }

    return prismaWithAssists.projectAssist.create({
      data: {
        projectId,
        userId: assistUserId,
        assignedById: actorId,
        isActive,
      },
      include: {
        user: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true },
        },
      },
    });
  }

  async listAssists(projectId: string, actorId: string) {
    await this.assertProjectManager(projectId, actorId);
    return prismaWithAssists.projectAssist.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true, isActive: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true },
        },
      },
      

      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateAssist(projectId: string, assistUserId: string, actorId: string, isActive: boolean) {
    await this.assertProjectManager(projectId, actorId);

    const existing = await prismaWithAssists.projectAssist.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assistUserId,
        },
      },
      select: { id: true, isActive: true },
    });

    if (!existing) {
      throw new AppError("Project assist not found", 404);
    }

    if (isActive && !existing.isActive) {
      await this.assertActiveUser(assistUserId);
      await this.ensureProjectTeamMember(projectId, assistUserId);
      await this.assertAssistCapacity(projectId, assistUserId);
    }

    return prismaWithAssists.projectAssist.update({
      where: {
        projectId_userId: {
          projectId,
          userId: assistUserId,
        },
      },
      data: {
        isActive,
        assignedById: actorId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true, isActive: true },
        },
      },
    });
  }

  async deleteAssist(projectId: string, assistUserId: string, actorId: string) {
    await this.assertProjectManager(projectId, actorId);

    const existing = await prismaWithAssists.projectAssist.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assistUserId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError("Project assist not found", 404);
    }

    await prismaWithAssists.projectAssist.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: assistUserId,
        },
      },
    });
  }

  async assertRfiSubmittalCreateUpdateAccess(
    projectId: string,
    user: UserJwt,
    action: "CREATE" | "UPDATE" = "UPDATE"
  ): Promise<RfiSubmittalAccess> {
    console.log(`[assertAccess] ---- START ----`);
    console.log(`[assertAccess] action: ${action}`);
    console.log(`[assertAccess] projectId: ${projectId}`);
    console.log(`[assertAccess] user.id: ${user.id}`);
    console.log(`[assertAccess] user.role: ${user.role}`);
    console.log(`[assertAccess] ELEVATED_ROLES set:`, Array.from(ELEVATED_ROLES));
    console.log(`[assertAccess] ELEVATED_ROLES.has(user.role): ${ELEVATED_ROLES.has(user.role)}`);

    const project = await this.getProjectOrThrow(projectId);
    console.log(`[assertAccess] project found: id=${project.id}, managerID=${project.managerID}, teamID=${project.teamID}`);

    if (ELEVATED_ROLES.has(user.role)) {
      console.log(`[assertAccess] ✅ PASSED via ELEVATED_ROLES — returning early`);
      return { isAssist: false, projectManagerId: project.managerID };
    }

    console.log(`[assertAccess] ❌ NOT in ELEVATED_ROLES — checking PROJECT_MANAGER...`);

    if (user.role === "PROJECT_MANAGER" && user.id === project.managerID) {
      console.log(`[assertAccess] ✅ PASSED via PROJECT_MANAGER match`);
      return { isAssist: false, projectManagerId: project.managerID };
    }

    console.log(`[assertAccess] ❌ NOT project manager — checking team membership...`);

    if (action === "CREATE" && project.teamID) {
      const isTeamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: project.teamID,
          userId: user.id
        }
      });
      console.log(`[assertAccess] teamID: ${project.teamID}, isTeamMember: ${!!isTeamMember}`);
      if (isTeamMember) {
        console.log(`[assertAccess] ✅ PASSED via team membership`);
        return { isAssist: false, projectManagerId: project.managerID };
      }
    } else {
      console.log(`[assertAccess] Skipping team check — action=${action}, teamID=${project.teamID}`);
    }

    console.log(`[assertAccess] ❌ NOT a team member — checking projectAssist record...`);

    const assist = await prismaWithAssists.projectAssist.findFirst({
      where: {
        projectId,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    console.log(`[assertAccess] projectAssist record found: ${JSON.stringify(assist)}`);

    if (!assist) {
      console.log(`[assertAccess] ❌ No assist record — throwing 403`);
      throw new AppError(`You are not allowed to ${action.toLowerCase()} RFI or Submittals for this project`, 403);
    }

    console.log(`[assertAccess] ✅ PASSED via projectAssist`);
    return { isAssist: true, projectManagerId: project.managerID };
  }
}
