import prisma from "../../../config/database/client";
import { CreateSubmittalsDto, UpdateSubmittalsDto } from "../dtos";

export class SubmitalRepository {

  // -----------------------------
  // CREATE SUBMITTAL (IDENTITY)
  // -----------------------------
  async create(
    data: CreateSubmittalsDto,
    userId: string,
    approval: boolean
  ) {
    return prisma.submittals.create({
      data: {
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
