import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import { AppError } from "../../../config/utils/AppError";

export class SubmittalVersionRepository {

  // ------------------------------------------------
  // CREATE INITIAL VERSION (v1)
  // ------------------------------------------------
  async createInitialVersion(
    submittalId: string,
    data: {
      description: string;
      files?: Prisma.InputJsonValue;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Safety: ensure no versions already exist
      const existingCount = await tx.submittalVersion.count({
        where: { submittalId },
      });

      if (existingCount > 0) {
        throw new AppError(
          "Initial version already exists for this submittal",
          400
        );
      }

      const version = await tx.submittalVersion.create({
        data: {
          submittalId,
          versionNumber: 1,
          description: data.description,
          files: data.files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // 🔑 Point submittal to v1
      await tx.submittals.update({
        where: { id: submittalId },
        data: {
          currentVersionId: version.id,
        },
      });

      return version;
    });
  }

  // ------------------------------------------------
  // CREATE NEW VERSION (v2, v3, ...)
  // ------------------------------------------------
  async createNewVersion(
    submittalId: string,
    data: {
      description: string;
      files?: Prisma.InputJsonValue;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Fetch current version
      const currentVersion = await tx.submittalVersion.findFirst({
        where: {
          submittalId,
          isActive: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
      });

      if (!currentVersion) {
        throw new AppError(
          "No active version found for this submittal",
          400
        );
      }

      const nextVersionNumber = currentVersion.versionNumber + 1;

      // Deactivate current version
      await tx.submittalVersion.update({
        where: { id: currentVersion.id },
        data: { isActive: false },
      });

      // Create new version
      const newVersion = await tx.submittalVersion.create({
        data: {
          submittalId,
          versionNumber: nextVersionNumber,
          description: data.description,
          files: data.files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // Update pointer on parent submittal
      await tx.submittals.update({
        where: { id: submittalId },
        data: {
          currentVersionId: newVersion.id,
        },
      });

      return newVersion;
    });
  }

  // ------------------------------------------------
  // GET VERSION BY ID
  // ------------------------------------------------
  async getById(versionId: string) {
    return prisma.submittalVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            id: true,
          },
        },
      },
    });
  }

  // ------------------------------------------------
  // LIST ALL VERSIONS FOR A SUBMITTAL
  // ------------------------------------------------
  async listBySubmittal(submittalId: string) {
    return prisma.submittalVersion.findMany({
      where: { submittalId },
      orderBy: { versionNumber: "desc" },
      include: {
        createdBy: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            id: true,
          },
        },
      },
    });
  }
}
