import path from "path";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
import { CreateFabricatorInput, FabricatorClientAdminHandoverInput, UpdateFabricatorInput } from "../dtos";
import { FabricatorRepository } from "../repositories";
import { streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import fs from "fs"
import prisma from "../../../config/database/client";

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

  async handoverClientAdmin(data: FabricatorClientAdminHandoverInput) {
    const { fabricatorId, oldAdminId, newAdminId } = data;
    if (oldAdminId === newAdminId) {
      throw new AppError("oldAdminId and newAdminId must be different", 400);
    }

    const [fabricator, newAdmin] = await Promise.all([
      prisma.fabricator.findFirst({
        where: {
          id: fabricatorId,
          pointOfContact: { some: { id: oldAdminId, role: "CLIENT_ADMIN" } },
        },
        include: { pointOfContact: true },
      }),
      prisma.user.findUnique({
        where: { id: newAdminId },
        select: { id: true, role: true },
      }),
    ]);

    if (!fabricator) {
      throw new AppError("Fabricator not found for the old client admin", 404);
    }
    if (!newAdmin || newAdmin.role !== "CLIENT_ADMIN") {
      throw new AppError("New admin must be a CLIENT_ADMIN user", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedFabricator = await tx.fabricator.update({
        where: { id: fabricatorId },
        data: {
          pointOfContact: {
            disconnect: [{ id: oldAdminId }],
            connect: [{ id: newAdminId }],
          },
        },
        include: { pointOfContact: true },
      });

      await tx.rFI.updateMany({
        where: {
          fabricator_id: fabricatorId,
          recepient_id: oldAdminId,
        },
        data: { recepient_id: newAdminId },
      });

      await tx.rFQ.updateMany({
        where: {
          fabricatorId: fabricatorId,
          recipientId: oldAdminId,
        },
        data: { recipientId: newAdminId },
      });

      await tx.submittals.updateMany({
        where: {
          fabricator_id: fabricatorId,
          recepient_id: oldAdminId,
        },
        data: { recepient_id: newAdminId },
      });

      await tx.changeOrder.updateMany({
        where: {
          recipients: oldAdminId,
          Recipients: {
            FabricatorPointOfContacts: { some: { id: fabricatorId } },
          },
        },
        data: { recipients: newAdminId },
      });

      return updatedFabricator;
    });

    return result;
  }
}
