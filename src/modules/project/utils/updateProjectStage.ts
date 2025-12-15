import { Stage } from "@prisma/client";
import prisma from "../../../config/database/client";
import { createProjectWbsForStage } from "./createProjectWbsForStorage";

export async function updateProjectStage(
  projectId: string,
  newStage: Stage
) {
    await createProjectWbsForStage(
      projectId,
      newStage
    );
  }
