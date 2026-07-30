import { Request, Response } from "express";
import { RFQResponseFileService } from "../services/rfqResFile.service";

export class RFQResponseFileController {
  private fileService = new RFQResponseFileService();

  async handleGetFile(req: Request, res: Response) {
    const { rfqResId, fileId } = req.params;
    const file = await this.fileService.getFile(rfqResId, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { rfqResId, fileId } = req.params;
    await this.fileService.viewFile(rfqResId, fileId, res);
  }
}
