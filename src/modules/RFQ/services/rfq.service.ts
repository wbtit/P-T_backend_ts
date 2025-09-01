import { RFQRepository } from "../repositeries";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { Request } from "express";
import { FileObject } from "../../../shared/fileType";

const rfqrepo= new RFQRepository();

export class RFQService {
    async createRfq(data:CreateRfqInput,createdById:string){
        const existing = await rfqrepo.getByName(data.projectNumber);
        if(existing) throw new AppError('RFQ with this project number already exists', 409);

        const rfq = await rfqrepo.create(data);
        return rfq;
    }
    async updateRfq(id:string,data:UpdateRfqInput){
        const existing = await rfqrepo.getById({id});
        if(!existing) throw new AppError('RFQ not found', 404);

        const rfq = await rfqrepo.update(id,data);
        return rfq;
    }
    async getRfqById(data:GetRfqInput){
        const existing = await rfqrepo.getById(data);
        if(!existing) throw new AppError('RFQ not found', 404);

        return existing;
    }
    async sents(senderId:string){
        return await rfqrepo.sentTouser(senderId);
    }
    async received(recipientId:string){
        return await rfqrepo.Inbox(recipientId);
    }
    async closeRfq(id:string){
        return await rfqrepo.closeRfq(id);
    }
   async getFile(rfqId: string, fileId: string,req:Request) {
        const rfq = await rfqrepo.getById({ id: rfqId });
        if (!rfq) throw new AppError("RFQ not found", 404);
        const files = req.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }
}