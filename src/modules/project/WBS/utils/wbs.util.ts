// cloneWBSAndSubtasks.ts
import newWBSActivity from "../../../../config/data/newWbsActivityData";
import newSubTasks from "../../../../config/data/newsubtaskdata";
import prisma from "../../../../config/database/client";
import { Stage, Activity } from "@prisma/client";

export async function createWBSAndProjectLineItems(projectId: string, stage: Stage) {
  console.log(`🚀 Seeding WBS + Subtasks for project=${projectId}, stage=${stage}`);

  try {
    // This function is deprecated - use the new bundle-based approach
    // Projects now use bundle selections instead of individual WBS creation
    console.log(`⚠️ createWBSAndProjectLineItems is deprecated. Use bundle selection approach instead.`);
    return;
  } catch (error) {
    console.error(
      `❌ Fatal: Failed to clone WBS and LineItems for project=${projectId}, stage=${stage}`,
      error
    );
    throw new Error("Failed to clone WBS and ProjectLineItems. Check logs for details.");
  }
}
