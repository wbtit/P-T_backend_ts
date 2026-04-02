import { RfqResponseRepository } from "../repositories";
import { CreateRFQResponseInput,GetRFQResponseInput } from "../dtos";
import { RFQRepository } from "../../repositeries";
import { AppError } from "../../../../config/utils/AppError";
import { Request } from "express";
import { FileObject } from "../../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../../utils/fileUtil";
import { Response } from "express";


export class RfqResponseService {
    private repository = new RfqResponseRepository();
    private rfqRepository = new RFQRepository();

    async create(data: CreateRFQResponseInput) {
        const rfqToInReview = await this.rfqRepository.update(data.rfqId, { status: 'IN_REVIEW' });
        if (!rfqToInReview) {
            throw new AppError("RFQ not found", 404);
        }
        if(data.parentResponseId && data.status && data.wbtStatus){
            await this.repository.update(
                data.parentResponseId,
                data.status,
                data.wbtStatus
            );
        }
        const createdResponse = await this.repository.create(data);
        return createdResponse;
    }

    async getById(params: GetRFQResponseInput) {
        return await this.repository.getById(params);
    }

    async getFile(rfqResId:string,fileId:string){
        const rfqRes= await this.repository.getById({id:rfqResId});
        if(!rfqRes) throw new AppError("RFQ Response not found",404);
        const files= rfqRes?.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }


    async viewFile(rfqResId:string,fileId:string,res:Response){
        const rfqRes= await this.repository.getById({id:rfqResId});

        if(!rfqRes) throw new AppError("RFQ Response not found",404);
        const files= rfqRes?.files as unknown as FileObject[];
        
        const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
        const fileObject = files.find((file: FileObject) => file.id === cleanFileId);
        
        if (!fileObject) {
    console.warn("⚠️ [viewFile] File not found in fabricator.files", {
      fileId,
      availableFileIds: files.map(f => f.id),
    });
    throw new AppError("File not found", 404);
  }
        const filePath = resolveUploadFilePath(fileObject);
                console.log("📁 [viewFile] Resolved file path:", filePath);

                if (!filePath) {
                    console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                    throw new AppError("File not found on server", 404);
                      }
                return streamFile(res, filePath, fileObject.originalName);
    }

}
