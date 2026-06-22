import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";

import { ConnectionDesignerQuotaService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { getEmailsByRoles, sendEmail } from "../../../services/mailServices/mailconfig";
import { UserRole } from "@prisma/client";
import { cdQuotaSubmittedHtmlContent } from "../../../services/mailServices/mailtemplates/cdQuotaSubmittedMailTemplate";
import prisma from "../../../config/database/client";
import { sendNotification } from "../../../utils/sendNotification";

export class ConnectionDesignerQuotaController {
  quotaService = new ConnectionDesignerQuotaService();

  // -------------------------------------------------------------------
  // Create Quota
  // -------------------------------------------------------------------
  async handleCreateQuota(req: AuthenticateRequest, res: Response) {
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "connectiondesignerQuotation"
    );

    const quota = await this.quotaService.createQuota({
      ...body,
      createdById: userId,
      ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
    });

    // Background task for sending email to internal roles
    (async () => {
      try {
        const INTERNAL_ROLES: UserRole[] = ["ADMIN", "OPERATION_EXECUTIVE", "DEPUTY_MANAGER", "PROJECT_MANAGER_OFFICER"];
        
        const internalUsers = await prisma.user.findMany({
          where: { role: { in: INTERNAL_ROLES }, isActive: true },
          select: { id: true, email: true }
        });

        const internalEmails = Array.from(new Set(internalUsers.map(u => u.email).filter(Boolean))) as string[];

        if (internalUsers.length > 0) {
          const quotaWithRfq = await prisma.connectionDesignerQuota.findUnique({
            where: { id: quota.id },
            include: { rfq: { include: { project: true } }, connectionDesigner: true }
          });

          if (quotaWithRfq) {
            if (internalEmails.length > 0) {
              await sendEmail({
                to: internalEmails,
                subject: `Connection Designer Quota Submitted: ${quotaWithRfq.rfq?.subject || "N/A"}`,
                html: cdQuotaSubmittedHtmlContent(quotaWithRfq)
              });
            }

            for (const user of internalUsers) {
              await sendNotification(user.id, {
                type: "rfq",
                title: "CD Quota Submitted",
                message: `Connection Designer ${quotaWithRfq.connectionDesigner?.name || ""} submitted a quota for RFQ: ${quotaWithRfq.rfq?.subject || "N/A"}`,
                rfqId: quotaWithRfq.rfqId,
                projectId: (quotaWithRfq.rfq as any)?.projectId || (quotaWithRfq.rfq as any)?.project_id || undefined,
                projectName: quotaWithRfq.rfq?.project?.name || (quotaWithRfq.rfq as any)?.projectName || "N/A"
              });
            }
          }
        }
      } catch (error) {
        console.error("Error sending CD quota submitted email:", error);
      }
    })();

    return res.status(201).json({
      message: "Connection Designer Quota created successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get All Quotas
  // -------------------------------------------------------------------
  async handleGetAllQuotas(req: Request, res: Response) {
    const quotas = await this.quotaService.getAllQuotas();

    return res.status(200).json({
      message: "Connection Designer Quotas fetched successfully",
      success: true,
      data: quotas,
    });
  }

  // -------------------------------------------------------------------
  // Get Quota By ID
  // -------------------------------------------------------------------
  async handleGetQuotaById(req: Request, res: Response) {
    const { id } = req.params;

    const quota = await this.quotaService.getQuotaById({ id });

    return res.status(200).json({
      message: "Connection Designer Quota fetched successfully",
      success: true,
      data: quota,
    });
  }

  // -------------------------------------------------------------------
  // Get Quotas by Designer ID
  // -------------------------------------------------------------------
  async handleGetQuotasByDesignerId(req: Request, res: Response) {
    const { designerId } = req.params;

    const quotas = await this.quotaService.getQuotasByDesignerId(designerId);

    return res.status(200).json({
      message: "Connection Designer Quotas fetched successfully",
      success: true,
      data: quotas,
    });
  }

  // -------------------------------------------------------------------
  // Update Quota
  // -------------------------------------------------------------------
  async handleUpdateQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const { body } = req;

    const userId = req.user?.id;
    if (!userId) throw new AppError("updatedById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "connectiondesignerQuotation"
    );

    const updatedQuota = await this.quotaService.updateQuota(
      { id },
      {
        ...body,
        updatedById: userId,
        ...(uploadedFiles.length > 0 ? { files: uploadedFiles } : {}),
      }
    );

    return res.status(200).json({
      message: "Connection Designer Quota updated successfully",
      success: true,
      data: updatedQuota,
    });
  }

  // -------------------------------------------------------------------
  // Approve Quota
  // -------------------------------------------------------------------
  async handleApproveQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const approverId = req.user?.id;

    if (!approverId) throw new AppError("approverId is required", 400);

    const approved = await this.quotaService.approveQuota(id, approverId);

    return res.status(200).json({
      message: "Quota approved successfully",
      success: true,
      data: approved,
    });
  }

  // -------------------------------------------------------------------
  // Delete Quota
  // -------------------------------------------------------------------
  async handleDeleteQuota(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;

    const userId = req.user?.id;
    if (!userId) throw new AppError("deletedById is required", 400);

    await this.quotaService.deleteQuota({ id });

    return res.status(200).json({
      message: "Connection Designer Quota deleted successfully",
      success: true,
    });
  }

  // -------------------------------------------------------------------
  // Get File (Meta)
  // -------------------------------------------------------------------
  async handleGetFile(req: AuthenticateRequest, res: Response) {
    const { quotaId, fileId } = req.params;

    const file = await this.quotaService.getFile(quotaId, fileId);

    return res.status(200).json({
      message: "Connection Designer Quota file fetched successfully",
      success: true,
      data: file,
    });
  }

  // -------------------------------------------------------------------
  // View / Stream File
  // -------------------------------------------------------------------
  async handleViewFile(req: AuthenticateRequest, res: Response) {
    const { quotaId, fileId } = req.params;
    return this.quotaService.viewFile(quotaId, fileId, res);
  }
}

