import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { SubmittalService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail } from "../../../services/mailServices/mailconfig";
import { submittalhtmlContent } from "../../../services/mailServices/mailtemplates/submittalMailtemplate";

const submittalService = new SubmittalService();

export class SubmittalController {
  // CREATE SUBMITTAL
  async handleCreateSubmittal(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id: userId, role } = user;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    let isAproovedByAdmin = false;
    if (role === "ADMIN" || role === "DEPT_MANAGER") {
      isAproovedByAdmin = true;
    }

    const newsubmitals = await submittalService.createSubmittal(
      { ...req.body, files: uploadedFiles },
      userId,
      isAproovedByAdmin
    );
    const email = newsubmitals.recepients.email; // This might be null
    
    if (!email) {
      throw new Error("No recipient email provided");
    }
    sendEmail({
      to: email,
      subject: newsubmitals.subject,
      text: newsubmitals.description,
      html: submittalhtmlContent(newsubmitals),
    });

    res.status(201).json({
      message: "Submittal created",
      status: "success",
      data: newsubmitals,
    });
  }

  // UPDATE SUBMITTAL
  async handleUpdateSubmittal(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: submittalId } = req.params;

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    const updatedSubmittal = await submittalService.updateSubmittal(
      submittalId,
      { ...req.body, files: uploadedFiles }
    );

    res.status(200).json({
      status: "success",
      data: updatedSubmittal,
    });
  }

  // GET SUBMITTAL BY ID
  async handleGetSubmittalById(req: Request, res: Response) {
    const { id } = req.params;
    const submittal = await submittalService.getSubmittalById(id);

    res.status(200).json({
      status: "success",
      data: submittal,
    });
  }

  // GET SENT SUBMITTALS
  async handleSent(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;
    const sentSubmittals = await submittalService.sent(userId);

    res.status(200).json({
      status: "success",
      data: sentSubmittals,
    });
  }

  // GET RECEIVED SUBMITTALS
  async handleReceived(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id: userId } = req.user;
    const receivedSubmittals = await submittalService.received(userId);

    res.status(200).json({
      status: "success",
      data: receivedSubmittals,
    });
  }

  // GET SUBMITTALS BY PROJECT
  async handleFindByProject(req: Request, res: Response) {
    const { projectId } = req.params;
    const submittals = await submittalService.findByProject(projectId);

    res.status(200).json({
      status: "success",
      data: submittals,
    });
  }

  // GET SPECIFIC FILE METADATA
  async handleGetFile(req: Request, res: Response) {
    const { submittalId, fileId } = req.params;
    const file = await submittalService.getFile(submittalId, fileId);

    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  // STREAM FILE
  async handleViewFile(req: Request, res: Response) {
    const { submittalId, fileId } = req.params;
    await submittalService.viewFile(submittalId, fileId, res);
  }
}
