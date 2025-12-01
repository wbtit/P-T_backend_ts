import { RfqResponseRepository } from "../repositories";
import { CreateRFQResponseInput,GetRFQResponseInput } from "../dtos";
import { RFQRepository } from "../../repositeries";
import { AppError } from "../../../../config/utils/AppError";
import { Request } from "express";
import { FileObject } from "../../../../shared/fileType";
import { streamFile } from "../../../../utils/fileUtil";
import path from "path";
import { Response } from "express";

export class RfqResponseService {
    private repository = new RfqResponseRepository();
    private rfqRepository = new RFQRepository();

    async create(data: CreateRFQResponseInput) {
        const rfqToInReview = await this.rfqRepository.update(data.rfqId, { status: 'IN_REVIEW' });
        if (!rfqToInReview) {
            throw new AppError("RFQ not found", 404);
        }
        if(data.parentResponseId){
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
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);
        const __dirname=path.resolve();
        const filePath = path.join(__dirname, fileObject.filename);
        return streamFile(res, filePath, fileObject.originalName);
    }

}