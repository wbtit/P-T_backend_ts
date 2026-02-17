import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { SubmittalService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { submittalhtmlContent } from "../../../services/mailServices/mailtemplates/submittalMailtemplate";

const submittalService = new SubmittalService();

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

    // 🔔 Email uses CURRENT VERSION
    const email = submittal.recepients?.email;
    if (email) {
      const ccEmails = await getCCEmails();
      sendEmail({
        to: email,
        cc: ccEmails,
        subject: submittal.subject,
        html: submittalhtmlContent(submittal),
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
    const { description } = req.body;

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

    const sent = await submittalService.sent(req.user.id);

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

    const received = await submittalService.received(req.user.id);

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
