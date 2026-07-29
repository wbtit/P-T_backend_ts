import { Request, Response } from "express";
import { FabricatorFileService } from "../services/fabricatorFile.service";

export class FabricatorFileController {
  private readonly fileService = new FabricatorFileService();

  async handleGetFile(req: Request, res: Response) {
    const { fabricatorId, fileId } = req.params;
    const file = await this.fileService.getFile(fabricatorId, fileId);

    return res.status(200).json({
      message: "File fetched successfully",
      success: true,
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { fabricatorId, fileId } = req.params;
    // here we stream/send file directly so no wrapping in {message,success}
    await this.fileService.viewFile(fabricatorId, fileId, res);
  }

  async handleDeleteFile(req: Request, res: Response) {
    const { fabricatorId, fileId } = req.params;
    await this.fileService.deleteFile(fabricatorId, fileId);
    return res.status(204).send();
  }
}
