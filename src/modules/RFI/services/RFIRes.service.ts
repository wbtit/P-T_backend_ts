import { UPLOAD_BASE_DIR } from "../../../utils/fileUtil";
import { RFIResponseRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { CreateRfiResDto,UpdateRFIResponseDto } from "../dtos";
import { RFIRepository } from "../repositories";
import { FileObject } from "../../../shared/fileType";
import path from "path";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import fs  from "fs";

const rfiResRepo= new RFIResponseRepository();
const rfiRepo= new RFIRepository();

export class RFIResponseService{
    async create(rfiId:string,userId:string,data:CreateRfiResDto){
        await rfiRepo.updateStatus(rfiId)
        const responseData = {
            ...data,
            rfiId,
        };
        if(responseData.parentResponseId!=undefined){
            await rfiResRepo.updateWithParentId(responseData)
    }
        return await rfiResRepo.create(responseData,userId)
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
        console.log("📥 [viewFile] Called with:", { id, fileId });
        const rfi = await rfiResRepo.findById(id);
        if (!rfi) {
    console.error("❌ [viewFile] Fabricator not found:", id);
    throw new AppError("Fabricator not found", 404);
  }
        const files = rfi.files as unknown as FileObject[];
        
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
        
            const __dirname = path.resolve();
            const filePath = path.join(UPLOAD_BASE_DIR, fileObject.path);
        
            if (!fs.existsSync(filePath)) {
                console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                throw new AppError("File not found on server", 404);
              }
        return streamFile(res, filePath, fileObject.originalName);
      }
}
