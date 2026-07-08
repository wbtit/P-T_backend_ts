import prisma from "../../../config/database/client";
import { CreateSubmittalsDto, UpdateSubmittalsDto } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";
import { Prisma, SubResStatus, UserRole } from "@prisma/client";
import { getRoleVisibilityFilter } from "../../../utils/roleFilter";

const ACTION_REQUIRED_FILTER = {
  some: {
    parentResponseId: null as null,
    status: SubResStatus.ACTION_REQUIRED,
  },
};

export class SubmitalRepository {
  private normalizeMilestoneIds(mileStoneIds?: string[]) {
    return Array.from(new Set((mileStoneIds ?? []).filter(Boolean)));
  }

  private async assertMilestonesExist(
    tx: Prisma.TransactionClient,
    mileStoneIds: string[]
  ) {
    if (mileStoneIds.length === 0) return;

    const count = await tx.mileStone.count({
      where: { id: { in: mileStoneIds } },
    });

    if (count !== mileStoneIds.length) {
      throw new AppError("One or more milestones were not found", 404);
    }
  }

  // -----------------------------
  // CREATE SUBMITTAL (IDENTITY)
  // -----------------------------
  async create(
    data: CreateSubmittalsDto,
    userId: string,
    approval: boolean
  ) {
    return prisma.$transaction(async (tx) => {
      const mileStoneIds = this.normalizeMilestoneIds(data.mileStoneIds);
      const primaryMileStoneId = mileStoneIds[0] ?? null;

      await this.assertMilestonesExist(tx, mileStoneIds);

      if (mileStoneIds.length > 0) {
        await tx.mileStone.updateMany({
          where: { id: { in: mileStoneIds } },
          data: {
            status: "COMPLETE",
            completeionPercentage: 100,
          },
        });
      }

      const project = await tx.project.findUnique({
        where: { id: data.project_id },
        select: { projectCode: true, projectNumber: true },
      });
      if (!project) {
        throw new AppError("Project not found for submittal serial generation", 404);
      }

      const serialNo = await generateProjectScopedSerial(tx, {
        prefix: SERIAL_PREFIX.SUBMITTAL,
        projectScopeId: data.project_id,
        projectToken: project.projectCode ?? project.projectNumber,
      });

      const created = await tx.submittals.create({
        data: {
          serialNo,
          subject: data.subject,
          fabricator_id: data.fabricator_id,
          mileStoneId: primaryMileStoneId,
          project_id: data.project_id,
          recepient_id: data.recepient_id,
          sender_id: userId,
          stage: data.stage,
          isAproovedByAdmin: approval,
          isConnectionDesign: data.isConnectionDesign ?? false,
          multipleRecipients: data.multipleRecipients?.length
            ? { connect: data.multipleRecipients.map((id: string) => ({ id })) }
            : undefined,
        },
      });

      if (mileStoneIds.length > 0) {
        await tx.milestoneSubmittal.createMany({
          data: mileStoneIds.map((mileStoneId) => ({
            mileStoneId,
            submittalId: created.id,
          })),
          skipDuplicates: true,
        });
      }

      return tx.submittals.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          recepients: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          multipleRecipients: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          project: { select: { name: true } },
          sender: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          mileStoneLinks: {
            include: {
              mileStone: true,
            },
          },
          mileStoneBelongsTo: true,
        },
      });
    });
  }

  // -----------------------------
  // FIND BY ID (WITH VERSIONS)
  // -----------------------------
  async findById(id: string) {
    return prisma.submittals.findUnique({
      where: { id },
      include: {
        fabricator: true,
        project: { select: { name: true } },
        recepients: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        sender: true,

        // 🔑 Versioning
        versions: {
          orderBy: { versionNumber: "desc" },
        },
        currentVersion:{
          include:{
            responses:{
              where: { parentResponseId: null },
              include:{
                childResponses:true
              }
            }
          }
        },

        // Responses
        submittalsResponse: {
          where: { parentResponseId: null },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            childResponses: {
              include:{
                user:{ select:{id:true, firstName:true, lastName:true, email:true},
              },
            },
          },
            submittalVersion: true,
          },
        },

        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
        mileStoneBelongsTo: true,
      },
    });
  }


  async getClientSidePendingSubmittals(role?: UserRole) {
    return prisma.submittals.findMany({
      where: {
        project: { status: { in: ["ACTIVE", "ONHOLD"] } },
        currentVersionId: { not: null },
        bfaStatus: false,
        ...getRoleVisibilityFilter(role),
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        multipleRecipients:true,
        sender:true,
        currentVersion: true,
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

async getPendingSubmittalsForClientAdmin(userId: string, role?: UserRole) {
    const fabricators = await prisma.fabricator.findMany({
      where: {
        pointOfContact: {
          some: { id: userId, role: "CLIENT_ADMIN" },
        },
        project: { some: { status: { in: ["ACTIVE", "ONHOLD"] } } }
      },
      select: { id: true },
    });

    const fabricatorIds = fabricators.map((f) => f.id);

    return prisma.submittals.findMany({
      where: {
        fabricator_id: { in: fabricatorIds },
        project: { status: { in: ["ACTIVE", "ONHOLD"] } },
        currentVersionId: { not: null },
        bfaStatus: false,
        ...getRoleVisibilityFilter(role),
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        currentVersion: true,
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  async getPendingSubmittalsForClient(userId: string, role?: UserRole) {
    return prisma.submittals.findMany({
      where: {
        project: { clientProjectManagers: { some: { id: userId } }, status: { not: "INACTIVE" } },
        currentVersionId: { not: null },
        bfaStatus: false,
        ...getRoleVisibilityFilter(role),
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }


async getPendingSubmittalsForDepartmentManager(managerId: string, role?: UserRole) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { departmentId: true },
  });
  if (!manager?.departmentId) return [];

  return prisma.submittals.findMany({
    where: {
      bfaStatus: false,
      currentVersionId: { not: null },
      ...getRoleVisibilityFilter(role),
      project: { departmentID: manager.departmentId,
       },
    },
    include: {
      project: { select: { name: true } },
      mileStoneBelongsTo: true,
      mileStoneLinks: {
        include: {
          mileStone: true,
        },
      },
      currentVersion: {
        include: {
          responses:{
            where: { parentResponseId: null },
            include:{
              childResponses:true
            }
          }
        }
      }
    }
  });
}

async getPendingSubmittalsForProjectManager(managerId: string, role?: UserRole) {
  return prisma.submittals.findMany({
    where: {
      bfaStatus: false,
      currentVersionId: { not: null },
      ...getRoleVisibilityFilter(role),
      project: { managerID: managerId },
    },
    include:{
      mileStoneBelongsTo: true,
      mileStoneLinks: {
        include: {
          mileStone: true,
        },
      },
      currentVersion:{
        include:{
          responses:{
            where: { parentResponseId: null },
            include: { childResponses: true }
          }
        }
      }
    }
  });
}

  // -----------------------------
  // UPDATE METADATA ONLY
  // (NO CONTENT, NO FILES)
  // -----------------------------
  async updateMetadata(
    id: string,
    data: UpdateSubmittalsDto
  ) {
    const mileStoneIds = data.mileStoneIds === undefined
      ? undefined
      : this.normalizeMilestoneIds(data.mileStoneIds);

    return prisma.$transaction(async (tx) => {
      if (mileStoneIds !== undefined) {
        await this.assertMilestonesExist(tx, mileStoneIds);

        if (mileStoneIds.length > 0) {
          await tx.mileStone.updateMany({
            where: { id: { in: mileStoneIds } },
            data: { status: "COMPLETE", completeionPercentage: 100 },
          });
        }
      }

      const updated = await tx.submittals.update({
        where: { id },
        data: {
          fabricator_id: data.fabricator_id,
          ...(mileStoneIds !== undefined ? { mileStoneId: mileStoneIds[0] ?? null } : {}),
          project_id: data.project_id,
          recepient_id: data.recepient_id,
          stage: data.stage,
          subject: data.subject,
          isAproovedByAdmin: data.isAproovedByAdmin,
          status: data.status,
          isConnectionDesign: data.isConnectionDesign,
        },
      });

      if (mileStoneIds !== undefined) {
        await tx.milestoneSubmittal.deleteMany({
          where: { submittalId: id },
        });

        if (mileStoneIds.length > 0) {
          await tx.milestoneSubmittal.createMany({
            data: mileStoneIds.map((mileStoneId) => ({
              mileStoneId,
              submittalId: id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });
  }

  // -----------------------------
  // SENT SUBMITTALS
  // -----------------------------
  async sentSubmittals(senderId: string, projectId?: string, role?: UserRole) {
    return prisma.submittals.findMany({
      where: {
        sender_id: senderId,
        ...(projectId ? { project_id: projectId } : {}),
        ...getRoleVisibilityFilter(role),
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  // -----------------------------
  // RECEIVED SUBMITTALS
  // -----------------------------
  async receivedSubmittals(recipientId: string, projectId?: string, role?: UserRole) {
    return prisma.submittals.findMany({
      where: {
        ...(projectId ? { project_id: projectId } : {}),
        ...getRoleVisibilityFilter(role),
        OR: [
          { recepient_id: recipientId },
          { multipleRecipients: { some: { id: recipientId } } },
          {
            submittalsResponse: {
              some: {
                OR: [
                  { userId: recipientId },
                  { childResponses: { some: { userId: recipientId } } },
                ],
              },
            },
          },
        ]
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        sender: true,
        recepients: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        currentVersion: true,
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  // -----------------------------
  // BY PROJECT
  // -----------------------------
  async findByProject(projectId: string, role?: UserRole) {
    return prisma.submittals.findMany({
      where: { project_id: projectId, ...getRoleVisibilityFilter(role) },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        sender: true,
        recepients: true,
        currentVersion: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        mileStoneBelongsTo: true,
        mileStoneLinks: {
          include: {
            mileStone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  async getPendingSubmittals(role?: UserRole){
    return prisma.submittals.findMany({
      where: {
        bfaStatus: false,
        currentVersionId: { not: null },
        ...getRoleVisibilityFilter(role),
      },
      include:{
          project:{select:{name:true}},
          fabricator:{select:{fabName:true}},
          multipleRecipients:true,
          sender:true,
          currentVersion: true,
          mileStoneBelongsTo: true,
          mileStoneLinks: {
            include: {
              mileStone: true,
            },
          },
        }
    })
  }
}
