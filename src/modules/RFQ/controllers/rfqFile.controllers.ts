import { Request, Response } from "express";
import { RFQFileService } from "../services/rfqFile.service";

export class RFQFileController {
    private readonly fileService = new RFQFileService();

    async handleGetFile(req: Request, res: Response) {
        const { rfqId, fileId } = req.params;
        const file = await this.fileService.getFile(rfqId, fileId);
        res.status(200).json({
            status: 'success',
            data: file,
        });
    }

    async handleViewFile(req: Request, res: Response) {
        const { rfqId, fileId } = req.params;
        await this.fileService.viewFile(rfqId, fileId, res);
    }
}
