import { RFQRepository } from "../repositeries";
import { PaginationQuery } from "../../../utils/pagination";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";

import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import prisma from "../../../config/database/client";
import {
  generateProjectScopedSerial,
  SERIAL_PREFIX,
} from "../../../utils/serial.util";
import { invalidateDashboardCache, invalidationPatterns } from "../../../utils/dashboardCache";


const rfqrepo= new RFQRepository();

export class RFQService {
  async createRfq(data: CreateRfqInput, createdById: string) {
    const senderId = data.senderId ?? createdById;
    const projectNumber = data.projectNumber?.trim();
    const projectName = data.projectName.trim().replace(/\s+/g, " ");
    const location = (data.location?.trim().replace(/\s+/g, " ") || "GENERAL");
    const subject = data.subject.trim().replace(/\s+/g, " ");



    let rfq;
    let attempts = 0;
    while (attempts < 5) {
      try {
        rfq = await prisma.$transaction(async (tx) => {
          const duplicateRfq = await rfqrepo.findDuplicateForCreate(
            tx,
            projectName,
            location,
            subject
          );

          if (duplicateRfq) {
            throw new AppError("An RFQ with the same project, location, and subject already exists", 409);
          }

          const fabricator = await tx.fabricator.findUnique({
            where: { id: data.fabricatorId },
            select: {
              wbtFabricatorPointOfContact: {
                select: { id: true },
              },
            },
          });

          if (!fabricator) {
            throw new AppError("Fabricator not found", 404);
          }

          const recipientId = fabricator.wbtFabricatorPointOfContact[0]?.id;
          if (!recipientId) {
            throw new AppError(
              "No wbtFabricatorPointOfContact found for selected fabricator",
              400
            );
          }
          const multipleRecipients = fabricator.wbtFabricatorPointOfContact.map(poc => poc.id);

          const project = projectNumber
            ? await tx.project.findUnique({
                where: { projectNumber },
                select: { id: true, projectCode: true },
              })
            : null;

          const serialNo = await generateProjectScopedSerial(tx, {
            prefix: SERIAL_PREFIX.RFQ,
            projectScopeId:
              project?.id ??
              `RFQ_ENTRY:${(projectName || "RFQ").toUpperCase()}:${location.toUpperCase()}`,
            projectToken: project?.projectCode || projectNumber || projectName || "RFQ",
          });

          return rfqrepo.createWithTx(tx, {
            ...data,
            projectName,
            location,
            subject,
            senderId,
            recipientId,
            multipleRecipients,
            projectNumber,
            serialNo,
            status: "SENT",
            wbtStatus: "RECEIVED",
          });
        });
        break; // If transaction succeeds, exit loop
      } catch (error: any) {
        if (error.code === "P2002" && (error.meta?.target as string[] | string | undefined)?.includes("serialNo")) {
          attempts++;
          if (attempts >= 5) throw error;
          continue; // Retry
        }
        throw error;
      }
    }

    try {
      await invalidateDashboardCache(invalidationPatterns.onRFQChange);
    } catch (err) {
      console.error("Failed to invalidate cache on RFQ create:", err);
    }

    return { newRfq: rfq };
  }

    async updateRfq(id:string,data:UpdateRfqInput){
        const existing = await rfqrepo.getById({id});
        if(!existing) throw new AppError('RFQ not found', 404);

        const rfq = await rfqrepo.update(id,data);

        try {
          await invalidateDashboardCache(invalidationPatterns.onRFQChange);
        } catch (err) {
          console.error("Failed to invalidate cache on RFQ update:", err);
        }

        return rfq;
    }
    async getRfqById(
      data: GetRfqInput,
      user?: { role?: string; connectionDesignerId?: string | null }
    ){
        if (user?.role === "CONNECTION_DESIGNER_ENGINEER" && user.connectionDesignerId) {
            const filtered = await rfqrepo.getByIdForConnectionDesigner(
              data.id,
              user.connectionDesignerId
            );
            
            if(!filtered) throw new AppError('RFQ not found', 404);
            return filtered;
        }

        const existing = await rfqrepo.getById(data);
        if(!existing) throw new AppError('RFQ not found', 404);

        return existing;
    }

    async getResponsesByRfqId(rfqId: string, user: any) {
        return await rfqrepo.getResponsesByRfqId(rfqId, user);
    }
    async getAllRFQ(query: PaginationQuery){
        return await rfqrepo.getAllRFQ(query);
    }
    async sents(query: PaginationQuery, senderId:string, projectId?: string){
        return await rfqrepo.sentTouser(query, senderId, projectId);
    }
    async received(query: PaginationQuery, recipientId:string, projectId?: string){
        return await rfqrepo.Inbox(query, recipientId, projectId);
    }

    async findByProject(projectId: string) {
        return await rfqrepo.findByProject(projectId);
    }

    async findByLoggedInUserFabricators(userId: string) {
        const fabricatorIds = await rfqrepo.findFabricatorIdsForUser(userId);
        const rfqs = await rfqrepo.findByFabricatorIds(fabricatorIds);

        return {
            fabricatorIds,
            rfqs,
        };
    }

    async getClientSidePendingRFQs() {
        return await rfqrepo.findClientSidePendingRFQs();
    }

    async getPendingForClientAdmin(userId:string){
        return await rfqrepo.findPendingRFQsForClientAdmin(userId);
    }

    async getPendingForClient(userId:string){
        return await rfqrepo.findPendingRFQsForClient(userId);
    }
    async closeRfq(id:string){
        const rfq = await rfqrepo.closeRfq(id);
        try {
          await invalidateDashboardCache(invalidationPatterns.onRFQChange);
        } catch (err) {
          console.error("Failed to invalidate cache on RFQ close:", err);
        }
        return rfq;
    }
    async deleteRFQ(id:string){
        const rfq = await rfqrepo.deleteRFQ(id);
        try {
          await invalidateDashboardCache(invalidationPatterns.onRFQChange);
        } catch (err) {
          console.error("Failed to invalidate cache on RFQ delete:", err);
        }
        return rfq;
    }
    async getRFQOfConnectionEngineer(userId:string){
        return await rfqrepo.getRFQOfConnectionEngineer(userId);
    }


    async getPendingRFQs(){
        return await rfqrepo.getPendingRFQs();
    }

    async getPendingRFQsForDepartmentManager(managerId: string) {
        return await rfqrepo.findPendingRFQsForDepartmentManager(managerId);
    }

    async getPendingRFQsForProjectManager(managerId: string) {
        return await rfqrepo.findPendingRFQsForProjectManager(managerId);
    }

    async getNewRFQsForProjectManager(managerId: string) {
        return await rfqrepo.findNewRFQsForProjectManager(managerId);
    }

    async getRFQsForClientEstimator(userId: string) {
        return await rfqrepo.findRFQsForClientEstimator(userId);
    }
}
