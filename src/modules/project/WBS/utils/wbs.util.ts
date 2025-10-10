// cloneWBSAndSubtasks.ts
import newWBSActivity from "../../../../config/data/newWbsActivityData";
import newSubTasks from "../../../../config/data/newsubtaskdata";
import prisma from "../../../../config/database/client";
import { Stage, Activity } from "@prisma/client";

export async function createWBSAndProjectLineItems(projectId: string, stage: Stage) {
  console.log(`🚀 Seeding WBS + Subtasks for project=${projectId}, stage=${stage}`);

  try {
    // --- Step 1: Fetch existing WBS
    const existingWBS = await prisma.workBreakdown.findMany({
      where: { projectId, stage },
      select: { id: true, templateKey: true },
    });

    console.log(`ℹ️ Found ${existingWBS.length} existing WBS records for project=${projectId}, stage=${stage}`);

    const existingWBSTemplateKeys = new Set(existingWBS.map((wbs) => wbs.templateKey));
    const existingWBSIdMap = new Map(existingWBS.map((a) => [a.templateKey, a.id]));
    const wbsIdMap = new Map<string, string>();

    let createdWBSCount = 0;

    // --- Step 2: Ensure all WBS exist
    for (const templateWbs of newWBSActivity) {
      try {
        if (!existingWBSTemplateKeys.has(templateWbs.templateKey)) {
          const newWbs = await prisma.workBreakdown.create({
            data: {
              type: templateWbs.type as Activity,
              name: templateWbs.name,
              templateKey: templateWbs.templateKey,
              projectId,
              stage,
            },
          });
          wbsIdMap.set(templateWbs.id, newWbs.id);
          createdWBSCount++;
          console.log(`✅ Created WBS [${newWbs.name}] templateKey=${templateWbs.templateKey}`);
        } else {
          const existingId = existingWBSIdMap.get(templateWbs.templateKey);
          if (existingId) {
            wbsIdMap.set(templateWbs.id, existingId);
            console.log(`↩️ Using existing WBS templateKey=${templateWbs.templateKey}, id=${existingId}`);
          }
        }
      } catch (err) {
        console.error(`❌ Failed to create or map WBS templateKey=${templateWbs.templateKey}:`, err);
      }
    }

    // --- Step 3: Fetch existing LineItems
    const existingLineItems = await prisma.projectLineItems.findMany({
      where: { projectID: projectId, stage },
      select: { workBreakDownID: true, parentTemplateKey: true },
    });

    const existingLineItemsPairs = new Set(
      existingLineItems.map((li) => `${li.workBreakDownID}-${li.parentTemplateKey}`)
    );

    let createdLineItemsCount = 0;
    let skippedLineItemsCount = 0;

    // --- Step 4: Create missing LineItems
    for (const templateLineItem of newSubTasks) {
      const mappedWbsId = wbsIdMap.get(templateLineItem.wbsactivityID);

      if (!mappedWbsId) {
        console.warn(
          `⚠️ Subtask skipped: No mapped WBS for template ID=${templateLineItem.wbsactivityID}, description="${templateLineItem.description}"`
        );
        skippedLineItemsCount++;
        continue;
      }

      const lineItemsUniqueKey = `${mappedWbsId}-${templateLineItem.parentTemplateKey}`;

      if (!existingLineItemsPairs.has(lineItemsUniqueKey)) {
        try {
          await prisma.projectLineItems.create({
            data: {
              description: templateLineItem.description,
              stage,
              unitTime: templateLineItem.unitTime,
              CheckUnitTime: templateLineItem.CheckUnitTime,
              parentTemplateKey: templateLineItem.parentTemplateKey,
              projectID: projectId,
              workBreakDownID: mappedWbsId,
            },
          });
          createdLineItemsCount++;
          console.log(`✅ Created LineItem "${templateLineItem.description}" under WBS=${mappedWbsId}`);
        } catch (err) {
          console.error(
            `❌ Failed to create LineItem "${templateLineItem.description}" for WBS=${mappedWbsId}:`,
            err
          );
        }
      } else {
        console.log(
          `↩️ Skipped duplicate LineItem "${templateLineItem.description}" for WBS=${mappedWbsId}`
        );
        skippedLineItemsCount++;
      }
    }

    console.log(
      `🎉 Seeding complete for project=${projectId}, stage=${stage}. WBS created=${createdWBSCount}, LineItems created=${createdLineItemsCount}, skipped=${skippedLineItemsCount}`
    );
  } catch (error) {
    console.error(
      `❌ Fatal: Failed to clone WBS and LineItems for project=${projectId}, stage=${stage}`,
      error
    );
    throw new Error("Failed to clone WBS and ProjectLineItems. Check logs for details.");
  }
}
