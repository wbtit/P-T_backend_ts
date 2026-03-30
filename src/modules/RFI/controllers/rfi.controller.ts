import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFIService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { rfihtmlContent } from "../../../services/mailServices/mailtemplates/rfiMailtemplate";
import { notifyProjectStakeholders } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { ProjectAssistService } from "../../project/services/projectAssist.service";
import { sendNotification } from "../../../utils/sendNotification";

const rfiService = new RFIService();
const projectAssistService = new ProjectAssistService();
const RFI_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "STAFF",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class RFIController {
  // CREATE RFI
  async handleCreateRfi(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!req.user) {
      throw new AppError("User not found", 404);
    }
    const { id: userId } = req.user;
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      req.body.project_id,
      req.user
    );

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfi"
    );

    let isAproovedByAdmin=false;
    if (user?.role==="ADMIN" ||user?.role==="DEPT_MANAGER") {
            isAproovedByAdmin=true
    }

    const newrfi = await rfiService.createRfi(
      {
        ...req.body,
        files: uploadedFiles,
      },
      userId,
      isAproovedByAdmin
    );

    // Gather all recipient emails (scalar + multipleRecipients)
    const rfiAny = newrfi as any;
    const emails = [
      ...(rfiAny.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
      rfiAny.recepients?.email,
    ].filter(Boolean) as string[];
    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length > 0) {
      const ccEmails = await getCCEmails();
      await sendEmail({
        html: rfihtmlContent(newrfi),
        to: uniqueEmails.join(","),
        cc: ccEmails,
        subject: newrfi.subject,
        text: newrfi.description,
      });
    }
    await notifyProjectStakeholders(newrfi.project_id, RFI_NOTIFY_ROLES, {
      type: "RFI_CREATED",
      title: "RFI Created / Sent",
      message: `RFI '${newrfi.subject}' was created and sent.`,
      rfiId: newrfi.id,
      timestamp: new Date(),
    });
    if (isAproovedByAdmin) {
      await notifyProjectStakeholders(newrfi.project_id, RFI_NOTIFY_ROLES, {
        type: "RFI_APPROVED_BY_ADMIN",
        title: "RFI Approved by Admin",
        message: `RFI '${newrfi.subject}' was approved by admin.`,
        rfiId: newrfi.id,
        timestamp: new Date(),
      });
    }
    if (access.isAssist) {
      await sendNotification(access.projectManagerId, {
        type: "PM_ASSIST_RFI_CREATED",
        title: "Assist Created RFI",
        message: `Assist '${req.user.username}' created RFI '${newrfi.subject}'.`,
        actorUserId: req.user.id,
        actorUsername: req.user.username,
        projectId: req.body.project_id,
        rfiId: newrfi.id,
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      message:"RFI created",
      status: "success",
      data: newrfi,
    });
  }

  // UPDATE RFI
  async handleUpdateRfi(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: rfiId } = req.params;
    const existingRfi = await rfiService.getRfiById(rfiId);
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      existingRfi.project_id,
      req.user
    );

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfi"
    );

    const updatedRfi = await rfiService.updateRfi(rfiId, {
      ...req.body,
      files: uploadedFiles,
    });
    const updatedRfiSubject = (updatedRfi as any)?.subject?.trim?.();
    const approvalWasGranted =
      !existingRfi.isAproovedByAdmin &&
      (updatedRfi as any)?.isAproovedByAdmin === true;
    await notifyProjectStakeholders(existingRfi.project_id, RFI_NOTIFY_ROLES, {
      type: "RFI_UPDATED",
      title: "RFI Updated",
      message: updatedRfiSubject
        ? `RFI '${updatedRfiSubject}' was updated.`
        : "An RFI was updated.",
      rfiId,
      isAproovedByAdmin: (updatedRfi as any)?.isAproovedByAdmin ?? req.body?.isAproovedByAdmin ?? null,
      timestamp: new Date(),
    });
    if (approvalWasGranted) {
      await notifyProjectStakeholders(existingRfi.project_id, RFI_NOTIFY_ROLES, {
        type: "RFI_APPROVED_BY_ADMIN",
        title: "RFI Approved by Admin",
        message: updatedRfiSubject
          ? `RFI '${updatedRfiSubject}' was approved by admin.`
          : "An RFI was approved by admin.",
        rfiId,
        timestamp: new Date(),
      });
    }
    if (access.isAssist) {
      await sendNotification(access.projectManagerId, {
        type: "PM_ASSIST_RFI_UPDATED",
        title: "Assist Updated RFI",
        message: `Assist '${req.user.username}' updated RFI '${updatedRfiSubject ?? existingRfi.subject ?? "this RFI"}'.`,
        actorUserId: req.user.id,
        actorUsername: req.user.username,
        projectId: existingRfi.project_id,
        rfiId,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      status: "success",
      data: updatedRfi,
    });
  }

  // GET RFI by ID
  async handleGetRfiById(req: Request, res: Response) {
    const { id } = req.params;
    const rfi = await rfiService.getRfiById(id);

    res.status(200).json({
      status: "success",
      data: rfi,
    });
  }

  // GET sent RFIs for user
  async handleSent(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    const sentRfis = await rfiService.sent(userId);

    res.status(200).json({
      status: "success",
      data: sentRfis,
    });
  }

  // GET received RFIs for user
  async handleReceived(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { projectId } = req.params;

    const receivedRfis = await rfiService.received(userId, projectId);

    res.status(200).json({
      status: "success",
      data: receivedRfis,
    });
  }

  // CLOSE RFI
  async handleCloseRfi(req: Request, res: Response) {
    const { id } = req.params;

    const closedRfi = await rfiService.closeRfi(id);

    res.status(200).json({
      status: "success",
      data: closedRfi,
    });
  }

  // GET a specific file from RFI
  async handleGetFile(req: Request, res: Response) {
    const { rfiId, fileId } = req.params;
    const file = await rfiService.getFile(rfiId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }


  async handlePendingForClientAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    const pendingRFIs = await rfiService.getPendingForClientAdmin(userId);

    res.status(200).json({
      status: "success",
      data: pendingRFIs,
    });
  }

  async handlePendingForClient(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;

    const pendingRFIs = await rfiService.getPendingForClient(userId);

    res.status(200).json({
      status: "success",
      data: pendingRFIs,
    });
  }

  // STREAM a file
  async handleViewFile(req: Request, res: Response) {
    const { rfiId, fileId } = req.params;
    await rfiService.viewFile(rfiId, fileId, res);
  }

  async handlePendingRFIs(req: AuthenticateRequest, res: Response) {
    const role = req.user?.role || "";
    const pendingRFIs = await rfiService.getPendingRFIs(role);

    res.status(200).json({
      status: "success",
      data: pendingRFIs,
    });
  }

  async handlePendingForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const pendingRFIs = await rfiService.getPendingRFIsForProjectManager(req.user.id);

    res.status(200).json({
      status: "success",
      data: pendingRFIs,
    });
  }

  async handleNewForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const newRFIs = await rfiService.getNewRFIsForProjectManager(req.user.id);

    res.status(200).json({
      status: "success",
      data: newRFIs,
    });
  }
}
