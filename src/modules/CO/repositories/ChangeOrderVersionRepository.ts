import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import { AppError } from "../../../config/utils/AppError";

export class ChangeOrderVersionRepository {

  // ------------------------------------------------
  // CREATE INITIAL VERSION (v1)
  // ------------------------------------------------
  async createInitialVersion(
    changeOrderId: string,
    data: {
      description: string;
      remarks?: string;
      files?: Prisma.InputJsonValue;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Safety: ensure no versions already exist
      const existingCount = await tx.changeOrderVersion.count({
        where: { changeOrderId },
      });

      if (existingCount > 0) {
        throw new AppError(
          "Initial version already exists for this Change Order",
          400
        );
      }

      const version = await tx.changeOrderVersion.create({
        data: {
          changeOrderId,
          versionNumber: 1,
          description: data.description,
          remarks: data.remarks ?? "",
          files: data.files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // 🔑 Point ChangeOrder to v1
      await tx.changeOrder.update({
        where: { id: changeOrderId },
        data: {
          currentVersionId: version.id,
          changeOrderVersion: 1,
        },
      });

      return version;
    });
  }

  // ------------------------------------------------
  // CREATE NEW VERSION (v2, v3, ...)
  // ------------------------------------------------
  async createNewVersion(
    changeOrderId: string,
    data: {
      description: string;
      remarks?: string;
      files?: Prisma.InputJsonValue;
    },
    userId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Fetch current version
      const currentVersion = await tx.changeOrderVersion.findFirst({
        where: {
          changeOrderId,
          isActive: true,
        },
        include: {
           changeOrderTables: true
        },
        orderBy: {
          versionNumber: "desc",
        },
      });

      if (!currentVersion) {
        throw new AppError(
          "No active version found for this Change Order",
          400
        );
      }

      const nextVersionNumber = currentVersion.versionNumber + 1;

      // Deactivate current version
      await tx.changeOrderVersion.update({
        where: { id: currentVersion.id },
        data: { isActive: false },
      });

      // Create new version
      const newVersion = await tx.changeOrderVersion.create({
        data: {
          changeOrderId,
          versionNumber: nextVersionNumber,
          description: data.description,
          remarks: data.remarks ?? "",
          files: data.files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // 🔑 Snapshotting: Duplicate line items from previous version to new version
      if (currentVersion.changeOrderTables && currentVersion.changeOrderTables.length > 0) {
          const newTables = currentVersion.changeOrderTables.map(table => {
              const { id, createdAt, updatedAt, changeOrderVersionId, ...rest } = table;
              return {
                  ...rest,
                  changeOrderVersionId: newVersion.id,
                  costUpdatedBy: userId,
                  costUpdatedAt: new Date(),
              };
          });

          await tx.changeOrdertable.createMany({
              data: newTables
          });
      }

      // Update pointer on parent ChangeOrder
      await tx.changeOrder.update({
        where: { id: changeOrderId },
        data: {
          currentVersionId: newVersion.id,
          changeOrderVersion: nextVersionNumber,
        },
      });

      return newVersion;
    });
  }

  // ------------------------------------------------
  // GET VERSION BY ID
  // ------------------------------------------------
  async getById(versionId: string) {
    return prisma.changeOrderVersion.findUnique({
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
        changeOrderTables: true
      },
    });
  }

  // ------------------------------------------------
  // LIST ALL VERSIONS FOR A CHANGE ORDER
  // ------------------------------------------------
  async listByChangeOrder(changeOrderId: string) {
    return prisma.changeOrderVersion.findMany({
      where: { changeOrderId },
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
