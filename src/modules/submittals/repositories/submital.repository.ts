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
          status: true,
        },
        include: {
          recepients: true,
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
        sender: true,

        // 🔑 Versioning
        versions: {
          orderBy: { versionNumber: "desc" },
        },
        currentVersion: true,

        // Responses
        submittalsResponse: {
          include: {
            childResponses: true,
            submittalVersion: true,
          },
        },

        mileStoneBelongsTo: true,
      },
    });
  }


async getPendingSubmittalsForClientAdmin(userId:string){
  const fabricator = await prisma.fabricator.findFirst({
            where: {
                pointOfContact: {
                    some: {
                        id: userId,
                        role: "CLIENT_ADMIN"
                    }
                }
            }
        })

        return prisma.submittals.findMany({
          where: {
                           fabricator:{id:fabricator?.id},
                           currentVersion:{
                            responses:{none:{}},
                           }
                        },
                        include: {
        project: { select: { name: true } },
        fabricator: true,
        recepients: true,
        currentVersion: true,
      },
      orderBy: { date: "desc" },
        })
}

async getPendingSubmittalsForProjectManager(managerId: string) {
  return prisma.submittals.findMany({
    where: {
      project: { managerID: managerId },
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
  async sentSubmittals(senderId: string) {
    return prisma.submittals.findMany({
      where: { sender_id: senderId },
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
  async receivedSubmittals(recipientId: string) {
    return prisma.submittals.findMany({
      where: { recepient_id: recipientId },
      include: {
        project: { select: { name: true } },
        fabricator: true,
        sender: true,
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
      },
      orderBy: { date: "desc" },
    });
  }

  async getPendingSubmittals(){
    return prisma.submittals.findMany({
      where: {
          status: false,
          currentVersion: { isNot: null },
        },include:{
          project:{select:{name:true}},
          fabricator:{select:{fabName:true}},
        }
    })
  }
}
