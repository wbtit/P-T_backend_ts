import { RfqResponseRepository } from "../repositories";
import { CreateRFQResponseInput,GetRFQResponseInput } from "../dtos";
import { RFQRepository } from "../../repositeries";
import { AppError } from "../../../../config/utils/AppError";
import { Request } from "express";
import { FileObject } from "../../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../../utils/fileUtil";
import { Response } from "express";
import prisma from "../../../../config/database/client";
import { invalidateDashboardCache, invalidationPatterns } from "../../../../utils/dashboardCache";

export class RfqResponseService {
    private repository = new RfqResponseRepository();
    private rfqRepository = new RFQRepository();

    async create(data: CreateRFQResponseInput, userId: string) {
        const rfq = await this.rfqRepository.getById({ id: data.rfqId });
        if (!rfq) throw new AppError("RFQ not found", 404);

        const isParentResponse = !data.parentResponseId;
        const isClientAcknowledgment = !!data.parentResponseId && !!data.acknowledgment;

        if (isParentResponse) {
            // WBT creating a new submission
            // Only allowed when RFQ is SENT or REVISE
            if (rfq.status !== "SENT" && rfq.status !== "REVISE") {
                throw new AppError(
                    "A new response can only be submitted when RFQ status is SENT or REVISE",
                    409
                );
            }

            // Update RFQ: both sides show WBT_SUBMITTED
            await this.rfqRepository.update(data.rfqId, {
                status: "WBT_SUBMITTED",
                wbtStatus: "WBT_SUBMITTED"
            });

        } else if (isClientAcknowledgment) {
            // Client acknowledging WBT's parent response
            // Only allowed when RFQ is currently WBT_SUBMITTED
            if (rfq.status !== "WBT_SUBMITTED") {
                throw new AppError(
                    "Acknowledgment can only be made after WBT submission",
                    409
                );
            }

            // Fetch the parent response to verify it exists and is a 
            // parent (not already a child)
            const parentResponse = await this.repository.getById({ 
                id: data.parentResponseId! 
            });
            if (!parentResponse) {
                throw new AppError("Parent response not found", 404);
            }
            if (parentResponse.parentResponseId) {
                throw new AppError(
                    "Cannot acknowledge a child response — only parent responses can be acknowledged",
                    400
                );
            }

            await prisma.$transaction(async (tx) => {
                // Update parent response status to the acknowledgment value
                await tx.rFQResponse.update({
                    where: { id: data.parentResponseId! },
                    data: {
                        status: data.acknowledgment,
                        wbtStatus: data.acknowledgment
                    }
                });

                // Update RFQ status on both sides
                await tx.rFQ.update({
                    where: { id: data.rfqId },
                    data: {
                        status: data.acknowledgment,
                        wbtStatus: data.acknowledgment
                    }
                });
            });

            // Invalidate dashboard cache
            try {
                await invalidateDashboardCache(invalidationPatterns.onRFQChange);
            } catch (err) {
                console.error("Cache invalidation failed on acknowledgment:", err);
            }
        }
        // If parentResponseId exists but no acknowledgment — this is a 
        // plain child response (e.g. internal notes/attachments under a 
        // response). Just create it with no status side effects.

        // Create the child RFQResponse record regardless of path
        const createdResponse = await this.repository.create({
            ...data,
            userId,
            // For acknowledgments, carry the acknowledgment as the 
            // child response's own status too so it's visible on the record
            status: data.acknowledgment ?? data.status ?? "RECEIVED",
            wbtStatus: data.acknowledgment ?? data.wbtStatus ?? "SENT"
        });

        return createdResponse;
    }

    async getById(params: GetRFQResponseInput) {
        return await this.repository.getById(params);
    }

    async getFile(rfqResId:string,fileId:string){
        const rfqRes= await this.repository.getById({id:rfqResId});
        if(!rfqRes) throw new AppError("RFQ Response not found",404);
        const files= rfqRes?.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }


    async viewFile(rfqResId:string,fileId:string,res:Response){
        const rfqRes= await this.repository.getById({id:rfqResId});

        if(!rfqRes) throw new AppError("RFQ Response not found",404);
        const files= rfqRes?.files as unknown as FileObject[];
        
        const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
        const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
        
        if (!fileObject) {
    console.warn("⚠️ [viewFile] File not found in fabricator.files", {
      fileId,
      availableFileIds: files.map(f => f.id),
    });
    throw new AppError("File not found", 404);
  }
        const filePath = resolveUploadFilePath(fileObject);
                console.log("📁 [viewFile] Resolved file path:", filePath);

                if (!filePath) {
                    console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                    throw new AppError("File not found on server", 404);
                      }
                return streamFile(res, filePath, fileObject.originalName);
    }

}
