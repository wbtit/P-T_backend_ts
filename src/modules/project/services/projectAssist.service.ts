import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
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
      throw new AppError("Only the project manager can manage project assists", 403);
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
    user: UserJwt
  ): Promise<RfiSubmittalAccess> {
    const project = await this.getProjectOrThrow(projectId);

    if (ELEVATED_ROLES.has(user.role)) {
      return { isAssist: false, projectManagerId: project.managerID };
    }

    if (user.role === "PROJECT_MANAGER" && user.id === project.managerID) {
      return { isAssist: false, projectManagerId: project.managerID };
    }

    const assist = await prismaWithAssists.projectAssist.findFirst({
      where: {
        projectId,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!assist) {
      throw new AppError("You are not allowed to create/update RFI or Submittals for this project", 403);
    }

    return { isAssist: true, projectManagerId: project.managerID };
  }
}
