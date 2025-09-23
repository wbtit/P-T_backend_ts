import { RFIResponseRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { CreateRfiResDto,UpdateRFIResponseDto } from "../dtos";
import { RFIRepository } from "../repositories";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";

const rfiResRepo= new RFIResponseRepository();
const rfiRepo= new RFIRepository();

export class RFIResponseService{
    async create(rfiId:string,userId:string,data:CreateRfiResDto){
        await rfiRepo.updateStatus(rfiId)
        if(data.parentResponseId!=undefined){
            await rfiResRepo.updateWithParentId(data)
    }
        return await rfiResRepo.create(data,userId)
    }

    async getById(id:string){
        return rfiResRepo.findById(id);
    }

    async findByProject(projectId:string){
        return await rfiResRepo.findByProjectId(projectId)
    }

    async getFile(rfiResId: string, fileId: string) {
        const rfi = await rfiResRepo.findById(rfiResId);
        if (!rfi) throw new AppError("RFI not found", 404);
    
        const files = rfi.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);
    
        return fileObject;
      }
    
      async viewFile(id: string, fileId: string, res: Response) {
        const rfi = await rfiResRepo.findById(id);
        if (!rfi) throw new AppError("RFI not found", 404);
    
        const files = rfi.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);
    
        const __dirname = path.resolve();
        const filePath = path.join(__dirname, fileObject.filename);
    
        return streamFile(res, filePath, fileObject.originalName);
      }
}