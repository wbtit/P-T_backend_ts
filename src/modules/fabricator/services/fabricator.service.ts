import { AppError } from "../../../config/utils/AppError";
import { PaginationQuery } from "../../../utils/pagination";
import { FileObject } from "../../../shared/fileType";
import { CreateFabricatorInput, FabricatorClientAdminHandoverInput, UpdateFabricatorInput } from "../dtos";
import { FabricatorRepository } from "../repositories";
import { resolveUploadFilePath, streamFile } from "../../../utils/fileUtil";
import { Response } from "express";
import prisma from "../../../config/database/client";
import fs from "fs";

const fabRepo = new FabricatorRepository();

export class FabricatorService {
  async createFabricator(data: CreateFabricatorInput, userId: string) {
    const existing = await fabRepo.findByName(data.fabName);
    if (existing) throw new AppError("Fabricator already exists", 409);

    const fabricator = await fabRepo.create(
      { ...data, files: data.files ?? [] },
      userId
    );
    return fabricator;
  }

  async getAllFabricators(query: PaginationQuery, filters?: { search?: string; stage?: string; contactId?: string }) {
    return fabRepo.findAllPaginated(query, filters);
  }

  async getFabricatorById(id: string) {
    return fabRepo.findById({ id });
  }

  async getFabricatorByCreatedById(createdById: string) {
    return fabRepo.findByCreatedById({ id: createdById });
  }

  async updateFabricator(id: string, data: UpdateFabricatorInput & { files?: FileObject[] }) {
    const existing = await fabRepo.findById({ id });
    if (!existing) throw new AppError("Fabricator not found", 404);

    const existingFiles = (existing.files as unknown as FileObject[]) ?? [];
    const newFiles = (data.files as unknown as FileObject[]) ?? [];

    const fabricator = await fabRepo.update({ id }, {
      ...data,
      files: [...existingFiles, ...newFiles],
    });
    return fabricator;
  }

  async deleteFabricator(id: string) {
    const existing = await fabRepo.findById({ id });
    if (!existing) throw new AppError("Fabricator not found", 404);

    await fabRepo.delete({ id });
    return { message: "Fabricator deleted successfully" };
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
        where: { fabricator_id: fabricatorId, recepient_id: oldAdminId },
        data: { recepient_id: newAdminId },
      });

      await tx.rFQ.updateMany({
        where: { fabricatorId, recipientId: oldAdminId },
        data: { recipientId: newAdminId },
      });

      await tx.submittals.updateMany({
        where: { fabricator_id: fabricatorId, recepient_id: oldAdminId },
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
