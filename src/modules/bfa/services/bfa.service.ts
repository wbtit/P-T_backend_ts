import { BfaRepository } from "../repositories";
import { CreateBfaDto, UpdateBfaDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
import { NotFoundError } from "../../../utils/errors";
import { FileObject } from "../../../shared/fileType";
import { Response } from "express";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import prisma from "../../../config/database/client";

const bfaRepo = new BfaRepository();

export class BfaService {
  async createBfa(data: CreateBfaDto, files: any, userId: string) {
    // 1. Programmatic enforcement of one-to-one relationship
    const existing = await bfaRepo.findBySubmittalId(data.submittalID);
    if (existing) {
      throw new AppError("A BFA already exists for this submittal", 400);
    }

    return await bfaRepo.create(data, files, userId);
  }

  async updateBfa(id: string, data: UpdateBfaDto, files: any, userId: string) {
    return await bfaRepo.update(id, data, files, userId);
  }

  async deleteBfa(id: string) {
    const existing = await bfaRepo.findById(id);
    if (!existing) {
      throw new AppError("BFA not found", 404);
    }
    return await bfaRepo.delete(id);
  }

  async getBfaById(id: string) {
    const bfa = await bfaRepo.findById(id);
    if (!bfa) {
      throw new AppError("BFA not found", 404);
    }
    return bfa;
  }

  async getBfaBySubmittalId(submittalId: string) {
    const bfa = await bfaRepo.findBySubmittalId(submittalId);
    if (!bfa) {
      throw new NotFoundError("BFA not found for the given submittal");
    }
    return bfa;
  }

  async listBfas() {
    return await bfaRepo.findAll();
  }

  async viewFile(bfaId: string, fileId: string, res: Response) {
    console.log("📥 [BfaService.viewFile] Called with:", { bfaId, fileId });

    // 1. Fetch the main BFA
    const bfa = await bfaRepo.findById(bfaId);
    if (!bfa) {
      console.error("❌ [BfaService.viewFile] BFA not found:", bfaId);
      throw new AppError("BFA not found", 404);
    }

    if (!bfa.currentVersionId) {
      console.error("❌ [BfaService.viewFile] BFA current version not found:", bfaId);
      throw new AppError("BFA current version not found", 404);
    }

    // 2. Fetch current version details
    const version = await prisma.bfaVersion.findFirst({
      where: {
        id: bfa.currentVersionId,
        bfaId: bfaId,
      },
    });

    if (!version) {
      console.error("❌ [BfaService.viewFile] BFA version details not found:", bfa.currentVersionId);
      throw new AppError("BFA version details not found", 404);
    }

    const files = (version.file as unknown as FileObject[]) || [];

    console.log("📂 [BfaService.viewFile] Available files:", files.map(f => ({
      id: f.id,
      path: f.path,
      filename: f.filename,
      originalName: f.originalName,
    })));

    // 3. Find the file within the version files list
    const cleanFileId = fileId.replace(/\.[^/.]+$/, "");
    const fileObject = files.find((file: FileObject) => file.id === cleanFileId);

    if (!fileObject) {
      console.warn("⚠️ [BfaService.viewFile] File not found in current version files:", {
        fileId,
        availableFileIds: files.map(f => f.id),
      });
      throw new AppError("File not found in current BFA version", 404);
    }

    // 4. Resolve the path and stream the file
    const filePath = resolveUploadFilePath(fileObject);
    if (!filePath) {
      console.error("🚨 [BfaService.viewFile] File does not exist on disk:", filePath);
      throw new AppError("File not found on server", 404);
    }

    return streamFile(res, filePath, fileObject.originalName);
  }
}
