import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { BfaService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";
import { sendEmail, getEmailsByRoles } from "../../../services/mailServices/mailconfig";
import { bfaHtmlContent } from "../../../services/mailServices/mailtemplates/bfaMailtemplate";
import prisma from "../../../config/database/client";
import { UserRole } from "@prisma/client";
import { getFabricatorNameForUser } from "../../../services/mailServices/mailtemplates/footerHelper";

const bfaService = new BfaService();

export class BfaController {
  async handleCreateBfa(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "bfa"
    );

    const bfa = await bfaService.createBfa(req.body, uploadedFiles, user.id);

    // Background non-blocking tasks
    (async () => {
      try {
        const submittal = await prisma.submittals.findUnique({
          where: { id: bfa.submittalID },
          include: {
            project: {
              include: {
                manager: true,
              },
            },
          },
        });

        if (submittal && submittal.project_id) {
          const projectId = submittal.project_id;
          const projectName = submittal.project?.name || "N/A";
          const submittalSubject = submittal.subject || "N/A";
          const projectManagerEmail = submittal.project?.manager?.email;

          // 1. Fetch internal emails
          const internalRoles: UserRole[] = ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE"];
          const otherEmails = await getEmailsByRoles(internalRoles);
          const recipientEmails = Array.from(
            new Set(
              [projectManagerEmail, ...otherEmails].filter(Boolean) as string[]
            )
          );

          // 2. Send email alert
            if (recipientEmails.length > 0) {
              const fabricatorName = (await getFabricatorNameForUser(user.id, user.role)) || undefined;
              await sendEmail({
                to: recipientEmails.join(","),
                subject: `New BFA Created - ${projectName}`,
                html: bfaHtmlContent(bfa, projectName, submittalSubject, fabricatorName),
              });
            }

          // 3. Send system notification
          const rolesToNotify: UserRole[] = ["ADMIN", "PROJECT_MANAGER", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE"];
          const bfaSerial = bfa.serialNo || "";

          await notifyProjectStakeholdersByRole(projectId, rolesToNotify, (role) =>
            buildRoleScopedNotification(role, {
              type: "BFA_CREATED",
              basePayload: { bfaId: bfa.id, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "BFA Created", message: `BFA '${bfaSerial}' was created.` },
                oversight: { title: "BFA Created", message: `BFA '${bfaSerial}' was created for project monitoring.` },
                internal: { title: "New BFA Created", message: `A new BFA '${bfaSerial}' was created.` },
                default: { title: "BFA Created", message: `A new BFA '${bfaSerial}' was created.` },
              },
            }),
            { excludeUserIds: [user.id] }
          );
        }
      } catch (error) {
        console.error("Error in handleCreateBfa background tasks:", error);
      }
    })();

    res.status(201).json({
      status: "success",
      message: "BFA created successfully with initial version (v1)",
      data: bfa,
    });
  }

  async handleUpdateBfa(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "bfa"
    );

    const bfa = await bfaService.updateBfa(id, req.body, uploadedFiles, user.id);

    res.status(200).json({
      status: "success",
      message: `BFA updated successfully. Bumps to version v${bfa.bfaVersion}`,
      data: bfa,
    });
  }

  async handleDeleteBfa(req: Request, res: Response) {
    const { id } = req.params;
    await bfaService.deleteBfa(id);

    res.status(200).json({
      status: "success",
      message: "BFA deleted successfully",
    });
  }

  async handleGetBfaById(req: Request, res: Response) {
    const { id } = req.params;
    const bfa = await bfaService.getBfaById(id);

    res.status(200).json({
      status: "success",
      data: bfa,
    });
  }

  async handleGetBfaBySubmittalId(req: Request, res: Response) {
    const { submittalId } = req.params;
    const bfa = await bfaService.getBfaBySubmittalId(submittalId);

    res.status(200).json({
      status: "success",
      data: bfa,
    });
  }

  async handleListBfas(req: Request, res: Response) {
    const bfas = await bfaService.listBfas();

    res.status(200).json({
      status: "success",
      data: bfas,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { bfaId, fileId } = req.params;
    await bfaService.viewFile(bfaId, fileId, res);
  }
}
