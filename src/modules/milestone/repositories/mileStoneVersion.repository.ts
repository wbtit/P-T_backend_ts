import { AppError } from "../../../config/utils/AppError";
import prisma from "../../../config/database/client";
import { Stage, Status } from "@prisma/client";

type MileStoneTypeValue =
  | "ANCHOR_BOLT"
  | "MAIN_STEEL"
  | "MAIN_STEEL_CONNECTION_DESIGN"
  | "MISC_STEEL"
  | "MISC_STEEL_CONNECTION_DESIGN"
  | "MAIN_AND_MISC_STEEL"
  | "MAIN_AND_MISC_STEEL_CONNECTION_DESIGN"
  | "FOUNDATION_EMBEDS"
  | "PANEL_EMBEDS"
  | "OTHERS";

type MileStoneVersionPayload = {
  approvalDate?: Date | null;
  isConnectionDesign?: boolean;
  status: Status;
  stage: Stage;
  subject: string;
  types: MileStoneTypeValue;
  subSubject?: string | null;
  description: string;
};

export class MileStoneVersionRepository {
  async createInitialVersion(
    mileStoneId: string,
    data: MileStoneVersionPayload
  ) {
    return prisma.$transaction(async (tx) => {
      const existingCount = await tx.mileStoneVersion.count({
        where: { mileStoneId },
      });

      if (existingCount > 0) {
        throw new AppError(
          "Initial version already exists for this milestone",
          400
        );
      }

      const version = await tx.mileStoneVersion.create({
        data: {
          mileStoneId,
          versionNumber: 1,
          approvalDate: data.approvalDate ?? null,
          isConnectionDesign: data.isConnectionDesign ?? false,
          status: data.status,
          stage: data.stage,
          subject: data.subject,
          types: data.types,
          subSubject: data.subSubject ?? "",
          description: data.description,
          isActive: true,
        },
      });

      await tx.mileStone.update({
        where: { id: mileStoneId },
        data: {
          currentVersionId: version.id,
          milestoneVersion: 1,
        },
      });

      return version;
    });
  }

  async createNewVersion(
    mileStoneId: string,
    data: {
      approvalDate?: Date | null;
      isConnectionDesign?: boolean;
      status?: Status;
      stage?: Stage;
      subject?: string;
      types?: MileStoneTypeValue;
      subSubject?: string | null;
      description?: string;
      fabricator_id?: string;
      project_id?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const currentVersion = await tx.mileStoneVersion.findFirst({
        where: {
          mileStoneId,
          isActive: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
      });

      if (!currentVersion) {
        throw new AppError("No active version found for this milestone", 400);
      }

      const nextVersionNumber = currentVersion.versionNumber + 1;

      await tx.mileStoneVersion.update({
        where: { id: currentVersion.id },
        data: { isActive: false },
      });

      const resolvedApprovalDate =
        data.approvalDate === undefined
          ? currentVersion.approvalDate
          : data.approvalDate;
      const resolvedIsConnectionDesign =
        data.isConnectionDesign ?? currentVersion.isConnectionDesign;
      const resolvedStatus = data.status ?? currentVersion.status;
      const resolvedStage = data.stage ?? currentVersion.stage;
      const resolvedSubject = data.subject ?? currentVersion.subject;
      const resolvedTypes = data.types ?? currentVersion.types;
      const resolvedSubSubject = data.subSubject ?? currentVersion.subSubject;
      const resolvedDescription = data.description ?? currentVersion.description;

      const newVersion = await tx.mileStoneVersion.create({
        data: {
          mileStoneId,
          versionNumber: nextVersionNumber,
          approvalDate: resolvedApprovalDate,
          isConnectionDesign: resolvedIsConnectionDesign,
          status: resolvedStatus,
          stage: resolvedStage,
          subject: resolvedSubject,
          types: resolvedTypes,
          subSubject: resolvedSubSubject,
          description: resolvedDescription,
          isActive: true,
        },
      });

      await tx.mileStone.update({
        where: { id: mileStoneId },
        data: {
          approvalDate: resolvedApprovalDate,
          isConnectionDesign: resolvedIsConnectionDesign,
          status: resolvedStatus,
          stage: resolvedStage,
          subject: resolvedSubject,
          types: resolvedTypes,
          subSubject: resolvedSubSubject,
          description: resolvedDescription,
          fabricator_id: data.fabricator_id,
          project_id: data.project_id,
          currentVersionId: newVersion.id,
          milestoneVersion: nextVersionNumber,
        },
      });

      return newVersion;
    });
  }
}
