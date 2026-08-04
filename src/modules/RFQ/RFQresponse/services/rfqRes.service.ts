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

        const isParentResponse = !data.parentResponseId || data.parentResponseId === "null" || data.parentResponseId === "";
        
        const validActions = ["AWARDED", "REJECTED", "CLOSED", "REVISE"];
        const action = data.status;
        const isClientAcknowledgment = !isParentResponse && !!action && validActions.includes(action);

        if (isParentResponse) {
            // WBT creating a new submission
            // Allowed when RFQ is SENT, REVISE, or WBT_SUBMITTED (for dual-submission)
            if (rfq.status !== "SENT" && rfq.status !== "REVISE" && rfq.status !== "WBT_SUBMITTED") {
                throw new AppError(
                    "A new response can only be submitted when RFQ is active (SENT, REVISE, or WBT_SUBMITTED).",
                    409
                );
            }

            // Type-Based Concurrency Lock
            const pendingResponses = await prisma.rFQResponse.findMany({
                where: {
                    rfqId: data.rfqId,
                    parentResponseId: null,
                    isDeleted: false,
                    status: "RECEIVED" // Still pending client review
                }
            });

            const targetType = data.type ?? "DETAILING";
            const hasSameTypePending = pendingResponses.some(r => (r.type ?? "DETAILING") === targetType);
            
            if (hasSameTypePending) {
                throw new AppError(
                    `A ${targetType} response has already been submitted and is pending client review.`,
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
            if (rfq.status === "AWARDED") {
                throw new AppError("This RFQ has already been awarded.", 409);
            }
            if (rfq.status === "CLOSED") {
                throw new AppError("This RFQ is already closed.", 409);
            }
            
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
                        status: action as any,
                        wbtStatus: action as any
                    }
                });

                // Update RFQ status on both sides
                await tx.rFQ.update({
                    where: { id: data.rfqId },
                    data: {
                        status: action as any,
                        wbtStatus: action as any
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
            status: (action as any) ?? "RECEIVED",
            wbtStatus: (action as any) ?? "SENT"
        });

        return createdResponse;
    }

    async getById(params: GetRFQResponseInput) {
        return await this.repository.getById(params);
    }



}
