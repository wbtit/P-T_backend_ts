import path from "path";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { CreateFabricatorInput, UpdateFabricatorInput } from "../dtos";
import { FabricatorRepository } from "../repositories";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import fs from "fs"

const fabRepo = new FabricatorRepository();


export class FabricatorService {
    async createFabricator(data: CreateFabricatorInput, userId: string) {
        const exsiting = await fabRepo.findByName(data.fabName);
        if(exsiting) throw new AppError('Fabricator already exists', 409);
       
        const fabricator= await fabRepo.create(
            {...data,files:data.files??[]},
            userId
        );
        return fabricator;
    }
    async getAllFabricators() {
        return fabRepo.findAll();
    }
    async getFabricatorById(id: string) {
        return fabRepo.findById({id});
    }
    async getFabricatorByCreatedById(createdById: string) {
        return fabRepo.findByCreatedById({id: createdById});
    }
    async updateFabricator(id: string, data: UpdateFabricatorInput & { files?: FileObject[] }) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        const existingFiles = (existing.files as unknown as FileObject[]) ?? [];
        const newFiles = (data.files as unknown as FileObject[]) ?? [];

        const fabricator = await fabRepo.update({id}, {
            ...data, files: [...existingFiles, ...newFiles]
        });
        return fabricator;
    }
    async deleteFabricator(id: string) {
        const existing = await fabRepo.findById({id});
        if(!existing) throw new AppError('Fabricator not found', 404);

        await fabRepo.delete({id});
        return { message: 'Fabricator deleted successfully' };
    }
    async getFile(fabricatorId: string, fileId: string) {
        const fabricator = await fabRepo.findById({ id: fabricatorId });
        if (!fabricator) throw new AppError('Fabricator not found', 404);

        const files = fabricator.files as unknown as FileObject[];
        const fileObject = files.find((file: FileObject) => file.id === fileId);
        if (!fileObject) throw new AppError("File not found", 404);

        return fileObject;
    }
    
async viewFile(fabricatorId: string, fileId: string, res: Response) {
  console.log("📥 [viewFile] Called with:", { fabricatorId, fileId });

  const fabricator = await fabRepo.findById({ id: fabricatorId });
  if (!fabricator) {
    console.error("❌ [viewFile] Fabricator not found:", fabricatorId);
    throw new AppError("Fabricator not found", 404);
  }

  const files = fabricator.files as unknown as FileObject[];
  console.log("📂 [viewFile] Available files:", files.map(f => ({
    id: f.id,
    path: f.path,
    filename: f.filename,
    originalName: f.originalName,
  })));

  // ✅ Fix here: remove .jpg extension from lookup, only compare the UUID part
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
  const filePath = path.join(__dirname, "public", fileObject.filename);
  console.log("📁 [viewFile] Resolved file path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("🚨 [viewFile] File does not exist on disk:", filePath);
    throw new AppError("File not found on server", 404);
  }

  return streamFile(res, filePath, fileObject.originalName);
}
 //Delete file
 async deleteFile(fabricatorId: string, fileId: string) {
    const fabricator = await fabRepo.findById({ id: fabricatorId });
    if (!fabricator) throw new Error("Fabricator not found");

    const files = fabricator.files as unknown as { id: string }[];
    const updatedFiles = files.filter((file) => file.id !== fileId);

    return fabRepo.update({ id: fabricatorId }, { files: updatedFiles });
  }
}