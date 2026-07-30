import { Request, Response } from "express";
import { RFQFollowUpFileService } from "../services/rfqFollowUpFile.service";

export class RFQFollowUpFileController {
  private fileService = new RFQFollowUpFileService();

  async handleGetFile(req: Request, res: Response) {
    const { id, fileId } = req.params;
    const file = await this.fileService.getFile(id, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { id, fileId } = req.params;
    await this.fileService.viewFile(id, fileId, res);
  }
}
