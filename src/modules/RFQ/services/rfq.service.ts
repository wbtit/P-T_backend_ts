import { RFQRepository } from "../repositeries";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";

import path from "path";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import fs from "fs";


const rfqrepo= new RFQRepository();

export class RFQService {
    async createRfq(data: CreateRfqInput, createdById: string) {


    // Use senderId from data if provided, otherwise fallback to createdById
    const senderId = data.senderId ?? createdById;
    const duplicateRfq = await rfqrepo.getbyProjectNameAndLocation(data.projectName, data.location || "");

    const rfq = await rfqrepo.create({
        ...data,
        senderId
    });

    return { newRfq: rfq, duplicateRfq };
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
    async getAllRFQ(){
        return await rfqrepo.getAllRFQ();
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
   async getFile(rfqId: string, fileId: string) {
        const rfq = await rfqrepo.getById({ id: rfqId });
        if (!rfq) throw new AppError("RFQ not found", 404);
        const files = rfq.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }
    async viewFile(id:string,fileId:string,res:Response){
        const rfq = await rfqrepo.getById({ id });
        if (!rfq) throw new AppError("RFQ not found", 404);

        const files = rfq.files as unknown as FileObject[];
        console.log("📂 [viewFile] Available files:", files.map(f => ({
    id: f.id,
    path: f.path,
    filename: f.filename,
    originalName: f.originalName,
  })));
        const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
        const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

        if (!fileObject) {
    console.warn("⚠️ [viewFile] File not found in fabricator.files", {
      fileId,
      availableFileIds: files.map(f => f.id),
    });
    throw new AppError("File not found", 404);
  }

        const __dirname=path.resolve();
        const filePath = path.join(__dirname, fileObject.path); // ✅ use path, not filename
        console.log("📁 [viewFile] Resolved file path:", filePath);

        if (!fs.existsSync(filePath)) {
            console.error("🚨 [viewFile] File does not exist on disk:", filePath);
            throw new AppError("File not found on server", 404);
              }
        return streamFile(res, filePath, fileObject.originalName);
    }

    async getPendingRFQs(){
        return await rfqrepo.getPendingRFQs();
    }
}
