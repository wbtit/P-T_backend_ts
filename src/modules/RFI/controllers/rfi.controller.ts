import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { RFIService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { rfihtmlContent } from "../../../services/mailServices/mailtemplates/rfiMailtemplate";

const rfiService = new RFIService();

export class RFIController {
  // CREATE RFI
  async handleCreateRfi(req: AuthenticateRequest, res: Response) {
    const user = req.user;
    if (!req.user) {
      throw new AppError("User not found", 404);
    }
    const { id: userId } = req.user;

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

    const email = newrfi.recepients.email; // This might be null

    if (!email) {
      throw new Error("No recipient email provided");
    }
    const ccEmails = await getCCEmails();
        await sendEmail({
          html: rfihtmlContent(newrfi),
          to: email,
          cc: ccEmails,
          subject: newrfi.subject,
          text: newrfi.description,
        });

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

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "rfi"
    );

    const updatedRfi = await rfiService.updateRfi(rfiId, {
      ...req.body,
      files: uploadedFiles,
    });

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

    const receivedRfis = await rfiService.received(userId);

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
}
