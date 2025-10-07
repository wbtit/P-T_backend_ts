import { Request,Response } from "express";
import { RfqResponseService } from "../services/rfqRes.service";
import { mapUploadedFiles } from "../../../uploads/fileUtil";


const rfqResponseService = new RfqResponseService();
export class RfqResponseController {
    async handleCreate(req: Request, res: Response) {
        const uploadedFiles = mapUploadedFiles(
              (req.files as Express.Multer.File[]) || [],
              "rfqresponse"
            );
        const payload = {
      ...req.body,
      files: uploadedFiles,
    };
        const result = await rfqResponseService.create(payload);
        return res.status(201).json({
            success:true,
            data:result
        });
    }

    async handleGetById(req: Request, res: Response) {
        const result = await rfqResponseService.getById({ id: req.params.id });
        return res.status(200).json({
            success:true,
            data:result
        });
    }

    async handleGetFile(req: Request, res: Response) {
        const { rfqResId, fileId } = req.params;
        const file = await rfqResponseService.getFile(rfqResId, fileId);
        return res.status(200).json({
            success: true,
            data: file
        });
    }
    async handleViewFile(req: Request, res: Response) {
        const { rfqResId, fileId } = req.params;
        await rfqResponseService.viewFile(rfqResId, fileId, res);
    }
}