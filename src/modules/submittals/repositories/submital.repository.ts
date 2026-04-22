import prisma from "../../../config/database/client";
import { CreateSubmittalsDto, UpdateSubmittalsDto } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class SubmitalRepository {

  // -----------------------------
  // CREATE SUBMITTAL (IDENTITY)
  // -----------------------------
  async create(
    data: CreateSubmittalsDto,
    userId: string,
    approval: boolean
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.mileStoneId) {
        await tx.mileStone.update({
          where: { id: data.mileStoneId },
          data: {
            status: "COMPLETE"
          }
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

      return tx.submittals.create({
        data: {
          serialNo,
          subject: data.subject,
          fabricator_id: data.fabricator_id,
          project_id: data.project_id,
          recepient_id: data.recepient_id,
          mileStoneId: data.mileStoneId,
          sender_id: userId,
          stage: data.stage,
          isAproovedByAdmin: approval,
          multipleRecipients: data.multipleRecipients?.length
            ? { connect: data.multipleRecipients.map((id: string) => ({ id })) }
            : undefined,
        },
        include: {
          recepients: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          multipleRecipients: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          project: { select: { name: true } },
          sender: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
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

        mileStoneBelongsTo: true,
      },
    });
  }


  async getClientSidePendingSubmittals() {
    return prisma.submittals.findMany({
      where: {
        project: { status: { in: ["ACTIVE", "ONHOLD"] } },
        currentVersionId: { not: null },
        currentVersion: {
          responses: { none: {} },
        },
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
      },
      orderBy: { date: "desc" },
    });
  }

async getPendingSubmittalsForClientAdmin(userId: string) {
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
        currentVersion: {
          responses: { none: {} },
        },
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
      },
      orderBy: { date: "desc" },
    });
  }

  async getPendingSubmittalsForClient(userId: string) {
    return prisma.submittals.findMany({
      where: {
        
        project: { clientProjectManagers: { some: { id: userId } }, status: { not: "INACTIVE" } },
        currentVersionId: { not: null },
        currentVersion: {
          responses: { none: {} },
        },
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
      },
      orderBy: { date: "desc" },
    });
  }


async getPendingSubmittalsForDepartmentManager(managerId: string) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { departmentId: true },
  });
  if (!manager?.departmentId) return [];

  return prisma.submittals.findMany({
    where: {
      status: false,
      currentVersionId: { not: null },
      project: { departmentID: manager.departmentId },
      currentVersion: {
        responses: {
          some: {
            parentResponseId: null,
            childResponses: { none: {} }
          }
        }
      }
    },
    include: {
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

async getPendingSubmittalsForProjectManager(managerId: string) {
  return prisma.submittals.findMany({
    where: {
      status: false,
      currentVersionId: { not: null },
      project: { managerID: managerId },
      currentVersion: {
        responses: {
          some: {
            parentResponseId: null,
            childResponses: { none: {} }
          }
        }
      }
    },
    include:{
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
    return prisma.submittals.update({
      where: { id },
      data: {
        fabricator_id: data.fabricator_id,
        project_id: data.project_id,
        recepient_id: data.recepient_id,
        stage: data.stage,
        subject: data.subject,
        isAproovedByAdmin: data.isAproovedByAdmin,
        status: data.status,
      },
    });
  }

  // -----------------------------
  // SENT SUBMITTALS
  // -----------------------------
  async sentSubmittals(senderId: string, projectId?: string) {
    return prisma.submittals.findMany({
      where: {
        sender_id: senderId,
        ...(projectId ? { project_id: projectId } : {}),
      },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
      },
      orderBy: { date: "desc" },
    });
  }

  // -----------------------------
  // RECEIVED SUBMITTALS
  // -----------------------------
  async receivedSubmittals(recipientId: string, projectId?: string) {
    return prisma.submittals.findMany({
      where: {
        ...(projectId ? { project_id: projectId } : {}),
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
      },
      orderBy: { date: "desc" },
    });
  }

  // -----------------------------
  // BY PROJECT
  // -----------------------------
  async findByProject(projectId: string) {
    return prisma.submittals.findMany({
      where: { project_id: projectId },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        sender: true,
        recepients: true,
        currentVersion: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async getPendingSubmittals(){
    return prisma.submittals.findMany({
      where: {
        status: false,
        currentVersionId: { not: null },
        currentVersion: {
          responses: {
            some: {
              parentResponseId: null,
              childResponses: { none: {} }
            }
          }
        }
      },include:{
          project:{select:{name:true}},
          fabricator:{select:{fabName:true}},
        }
    })
  }
}
