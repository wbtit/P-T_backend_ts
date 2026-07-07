import { RFIResponseRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import { CreateRfiResDto,UpdateRFIResponseDto } from "../dtos";
import { RFIRepository } from "../repositories";
import { FileObject } from "../../../shared/fileType";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import prisma from "../../../config/database/client";

const rfiResRepo= new RFIResponseRepository();
const rfiRepo= new RFIRepository();

export class RFIResponseService{
    async create(rfiId:string,userId:string,data:CreateRfiResDto){
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        const clientRoles = ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"];
        const isClient = clientRoles.includes(user?.role || "");

        // If frontend passes responseState or wbtStatus, we want to capture that input.
        const inputStatus = data.responseState || data.wbtStatus || "COMPLETE";

        let finalResponseState = inputStatus as any;
        let finalWbtStatus = inputStatus as any;

        if (isClient) {
            // Client response
            finalResponseState = inputStatus;
            finalWbtStatus = "RECEIVED";
        } else {
            // WBT response
            finalWbtStatus = inputStatus;
            finalResponseState = finalWbtStatus; // status same as wbtstatus
        }

        const responseData = {
            ...data,
            rfiId,
            responseState: finalResponseState,
            wbtStatus: finalWbtStatus
        };

        if(responseData.parentResponseId != undefined && responseData.parentResponseId !== "null" && responseData.parentResponseId !== ""){
            await rfiResRepo.updateWithParentId(responseData)
        }
        
        await rfiRepo.updateStatuses(rfiId, finalResponseState, finalWbtStatus);

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
        
            const filePath = resolveUploadFilePath(fileObject);
            if (!filePath) {
                console.error("🚨 [viewFile] File does not exist on disk:", filePath);
                throw new AppError("File not found on server", 404);
              }
        return streamFile(res, filePath, fileObject.originalName);
      }
}
