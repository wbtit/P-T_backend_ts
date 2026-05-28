import prisma from "../../../config/database/client";
import { CreateBfaDto, UpdateBfaDto } from "../dtos";
import { generateProjectScopedSerial } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";
import { Prisma } from "@prisma/client";

export class BfaRepository {
  async create(data: CreateBfaDto, files: any, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch submittal to verify it exists and get its project_id
      const submittal = await tx.submittals.findUnique({
        where: { id: data.submittalID },
        select: { project_id: true },
      });

      if (!submittal) {
        throw new AppError("Submittal not found for BFA creation", 404);
      }

      // 2. Fetch project details for serial number generation
      const project = await tx.project.findUnique({
        where: { id: submittal.project_id },
        select: { projectCode: true, projectNumber: true },
      });

      if (!project) {
        throw new AppError("Project not found for BFA serial generation", 404);
      }

      // 3. Generate serial number
      const serialNo = await generateProjectScopedSerial(tx, {
        prefix: "BFA",
        projectScopeId: submittal.project_id,
        projectToken: project.projectCode ?? project.projectNumber,
      });

      // 4. Create the main BFA record
      const bfa = await tx.bFA.create({
        data: {
          serialNo,
          submittalID: data.submittalID,
          subject: data.subject,
          description: data.description ?? "",
          status: data.status ?? "partial",
          createdById: userId,
          bfaVersion: 1,
        },
      });

      // 5. Create initial BfaVersion (v1)
      const bfaVersion = await tx.bfaVersion.create({
        data: {
          bfaId: bfa.id,
          versionNumber: 1,
          subject: data.subject,
          description: data.description ?? "",
          status: bfa.status,
          file: files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // 6. Point BFA to the current version & update submittal bfaStatus to true
      await tx.submittals.update({
        where: { id: data.submittalID },
        data: { bfaStatus: true },
      });

      const finalBfa = await tx.bFA.update({
        where: { id: bfa.id },
        data: {
          currentVersionId: bfaVersion.id,
        },
        include: {
          currentVersion: true,
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return finalBfa;
    });
  }

  async update(id: string, data: UpdateBfaDto, files: any, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Find existing BFA
      const existing = await tx.bFA.findUnique({
        where: { id },
        include: {
          currentVersion: true,
        },
      });

      if (!existing) {
        throw new AppError("BFA not found", 404);
      }

      const nextVersionNumber = existing.bfaVersion + 1;

      // 2. Deactivate previous version(s)
      await tx.bfaVersion.updateMany({
        where: { bfaId: id },
        data: { isActive: false },
      });

      // 3. Determine updated values
      const updatedSubject = data.subject !== undefined ? data.subject : existing.subject;
      const updatedDescription = data.description !== undefined ? data.description : existing.description;
      const updatedStatus = data.status !== undefined ? data.status : existing.status;

      // 4. Create new BfaVersion
      const newBfaVersion = await tx.bfaVersion.create({
        data: {
          bfaId: id,
          versionNumber: nextVersionNumber,
          subject: updatedSubject,
          description: updatedDescription,
          status: updatedStatus,
          file: files ?? [],
          createdById: userId,
          isActive: true,
        },
      });

      // 5. Update main BFA with new details and pointer
      const updatedBfa = await tx.bFA.update({
        where: { id },
        data: {
          subject: updatedSubject,
          description: updatedDescription,
          status: updatedStatus,
          bfaVersion: nextVersionNumber,
          currentVersionId: newBfaVersion.id,
        },
        include: {
          currentVersion: true,
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return updatedBfa;
    });
  }

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      const bfa = await tx.bFA.findUnique({
        where: { id },
        select: { submittalID: true },
      });

      if (bfa) {
        await tx.submittals.update({
          where: { id: bfa.submittalID },
          data: { bfaStatus: false },
        });
      }

      return tx.bFA.delete({
        where: { id },
      });
    });
  }

  async findById(id: string) {
    return prisma.bFA.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findBySubmittalId(submittalId: string) {
    return prisma.bFA.findUnique({
      where: { submittalID: submittalId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll() {
    return prisma.bFA.findMany({
      include: {
        currentVersion: true,
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
