import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { SubmittalService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { submittalhtmlContent } from "../../../services/mailServices/mailtemplates/submittalMailtemplate";
import { notifyProjectStakeholders } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { ProjectAssistService } from "../../project/services/projectAssist.service";
import { sendNotification } from "../../../utils/sendNotification";

const submittalService = new SubmittalService();
const projectAssistService = new ProjectAssistService();
const SUBMITTAL_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class SubmittalController {

  // --------------------------------------------------
  // CREATE SUBMITTAL + INITIAL VERSION (v1)
  // --------------------------------------------------
  async handleCreateSubmittal(
    req: AuthenticateRequest,
    res: Response
  ) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id: userId, role } = user;
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      req.body.project_id,
      user
    );

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    const isAproovedByAdmin =
      role === "ADMIN" || role === "DEPT_MANAGER";

    const { description, ...submittalData } = req.body;

    if (!description) {
      throw new AppError("Description is required", 400);
    }

    const submittal = await submittalService.createSubmittal(
      submittalData,
      userId,
      isAproovedByAdmin,
      {
        description,
        files: uploadedFiles,
      }
    );

    // Gather all recipient emails (scalar + multipleRecipients)
    const submittalAny = submittal as any;
    const submittalEmails = [
      ...(submittalAny.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
      submittalAny.recepients?.email,
    ].filter(Boolean) as string[];
    const uniqueSubmittalEmails = Array.from(new Set(submittalEmails));

    if (uniqueSubmittalEmails.length > 0) {
      const ccEmails = await getCCEmails();
      sendEmail({
        to: uniqueSubmittalEmails.join(","),
        cc: ccEmails,
        subject: submittal.subject,
        html: submittalhtmlContent(submittal),
      });
    }
    await notifyProjectStakeholders(submittal.project_id, SUBMITTAL_NOTIFY_ROLES, {
      type: "SUBMITTAL_CREATED",
      title: "Submittal Created / Sent",
      message: `Submittal '${submittal.subject}' was created and sent.`,
      submittalId: submittal.id,
      timestamp: new Date(),
    });
    if (access.isAssist) {
      await sendNotification(access.projectManagerId, {
        type: "PM_ASSIST_SUBMITTAL_CREATED",
        title: "Assist Created Submittal",
        message: `Assist '${user.username}' created submittal '${submittal.subject}'.`,
        actorUserId: user.id,
        actorUsername: user.username,
        projectId: req.body.project_id,
        submittalId: submittal.id,
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      status: "success",
      message: "Submittal created",
      data: submittal,
    });
  }
  async handlePendingForClientAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    
    const pendingSubmittals = await submittalService.getPendingSubmittalsForClientAdmin(id);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForClient(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    
    const pendingSubmittals = await submittalService.getPendingSubmittalsForClient(id);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }


  async handlePendingForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const pendingSubmittals = await submittalService.getPendingSubmittalsForProjectManager(id);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }
  // --------------------------------------------------
  // GET PENDING SUBMITTALS FOR RESPONSE
  // --------------------------------------------------
  async handleGetPendingSubmittals(
    req: AuthenticateRequest,
    res: Response
  ) {
       const pendingSubmittals = await submittalService.getPendingSubmittals();
       

    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }
  // --------------------------------------------------
  // CREATE NEW VERSION (CONTENT UPDATE)
  // --------------------------------------------------
  async handleCreateNewVersion(
    req: AuthenticateRequest,
    res: Response
  ) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);
    
    const { id: submittalId } = req.params;
    const existingSubmittal = await submittalService.getSubmittalById(submittalId);
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      existingSubmittal.project_id,
      user
    );
    const { description } = req.body;
    console.log(req.body);

    if (!description) {
      throw new AppError("Description is required", 400);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    const version = await submittalService.createNewVersion(
      submittalId,
      {
        description,
        files: uploadedFiles,
      },
      user.id
    );
    await notifyProjectStakeholders(existingSubmittal.project_id, SUBMITTAL_NOTIFY_ROLES, {
      type: "SUBMITTAL_NEW_VERSION",
      title: "New Submittal Version Uploaded",
      message: "A new submittal version has been uploaded.",
      submittalId,
      versionId: version.id,
      timestamp: new Date(),
    });
    if (access.isAssist) {
      await sendNotification(access.projectManagerId, {
        type: "PM_ASSIST_SUBMITTAL_UPDATED",
        title: "Assist Updated Submittal",
        message: `Assist '${user.username}' uploaded a new version for submittal '${existingSubmittal.subject ?? "this submittal"}'.`,
        actorUserId: user.id,
        actorUsername: user.username,
        projectId: existingSubmittal.project_id,
        submittalId,
        versionId: version.id,
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      status: "success",
      message: "New submittal version created",
      data: version,
    });
  }

  // --------------------------------------------------
  // GET SUBMITTAL BY ID (WITH VERSIONS)
  // --------------------------------------------------
  async handleGetSubmittalById(
    req: Request,
    res: Response
  ) {
    const { id } = req.params;

    const submittal = await submittalService.getSubmittalById(id);

    res.status(200).json({
      status: "success",
      data: submittal,
    });
  }

  // --------------------------------------------------
  // LIST SENT SUBMITTALS
  // --------------------------------------------------
  async handleSent(
    req: AuthenticateRequest,
    res: Response
  ) {
    if (!req.user) throw new AppError("User not found", 404);

    const { projectId } = req.params;
    const sent = await submittalService.sent(req.user.id, projectId);

    res.status(200).json({
      status: "success",
      data: sent,
    });
  }

  // --------------------------------------------------
  // LIST RECEIVED SUBMITTALS
  // --------------------------------------------------
  async handleReceived(
    req: AuthenticateRequest,
    res: Response
  ) {
    if (!req.user) throw new AppError("User not found", 404);

    const { projectId } = req.params;
    const received = await submittalService.received(req.user.id, projectId);

    res.status(200).json({
      status: "success",
      data: received,
    });
  }

  // --------------------------------------------------
  // FIND BY PROJECT
  // --------------------------------------------------
  async handleFindByProject(
    req: Request,
    res: Response
  ) {
    const { projectId } = req.params;

    const submittals = await submittalService.findByProject(projectId);

    res.status(200).json({
      status: "success",
      data: submittals,
    });
  }

  // --------------------------------------------------
  // STREAM FILE (VERSION-AWARE)
  // --------------------------------------------------
  async handleViewFile(
    req: AuthenticateRequest,
    res: Response
  ) {
    const { submittalId, versionId, fileId } = req.params;

    const isClient =
      req.user?.role === "CLIENT" ||
      req.user?.role === "CLIENT_ADMIN";

    await submittalService.viewFile(
      submittalId,
      versionId,
      fileId,
      res,
      isClient
    );
  }
}
