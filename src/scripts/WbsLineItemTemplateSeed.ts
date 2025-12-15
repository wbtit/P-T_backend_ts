import newSubTasks from "../config/data/newsubtaskdata";
import prisma from "../config/database/client";
import { Prisma } from "@prisma/client";

/**
 * Converts line-item keys like:
 *   mpBeamPlacement-first
 *   mpGirtPurlinPlacement-3
 *   connectionOfBeam2
 * into:
 *   mpBeamPlacement
 *   mpGirtPurlinPlacement
 *   connectionOfBeam
 */
function resolveParentTemplateKey(lineItemKey: string): string {
  if (!lineItemKey) return "";

  return lineItemKey
    // mpBeamPlacement-first, -second, etc.
    .replace(/-(first|second|third|fourth|straight|inclined|circular|three)$/i, "")
    // mpBeamPlacement-1, -2, etc.
    .replace(/-\d+$/, "")
    // connectionOfBeam1, columnDetailing2, etc.
    .replace(/\d+$/, "")
    .trim();
}


export async function seedWbsLineItemTemplates() {
  console.log("🌱 Seeding WBS line item templates...");

  let successCount = 0;
  let skippedCount = 0;
  let failureCount = 0;

  // 1️⃣ Load WBS templates
  const templates = await prisma.wbsTemplate.findMany({
    select: {
      id: true,
      templateKey: true,
    },
  });

  console.log(`📦 Loaded ${templates.length} WBS templates`);

  const templateMap = new Map<string, string>(
    templates.map((t) => [t.templateKey, t.id])
  );

  // 2️⃣ Seed line items
  for (const item of newSubTasks) {
    const parentTemplateKey = resolveParentTemplateKey(item.wbsTemplateKey);
    const wbsTemplateId = templateMap.get(parentTemplateKey);

    if (!wbsTemplateId) {
      skippedCount++;
      console.warn("⚠️ Skipping line item — parent WBS template not found", {
        originalKey: item.wbsTemplateKey,
        resolvedKey: parentTemplateKey,
        description: item.description,
      });
      continue;
    }

    try {
      await prisma.wbsLineItemTemplate.upsert({
        where: {
          wbsTemplateId_templateKey: {
            wbsTemplateId,
            templateKey: item.wbsTemplateKey, // keep FULL variant key
          },
        },
        update: {
          description: item.description,
          unitTime: item.unitTime,
          checkUnitTime: item.CheckUnitTime,
          isActive: true,
          isDeleted: false,
        },
        create: {
          wbsTemplateId,
          description: item.description,
          unitTime: item.unitTime,
          checkUnitTime: item.CheckUnitTime,
          templateKey: item.wbsTemplateKey, // variant-level uniqueness
        },
      });

      successCount++;
    } catch (error) {
      failureCount++;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("❌ Prisma error while seeding line item", {
          code: error.code,
          meta: error.meta,
          originalKey: item.wbsTemplateKey,
          resolvedKey: parentTemplateKey,
          description: item.description,
        });
      } else {
        console.error("❌ Unknown error while seeding line item", {
          originalKey: item.wbsTemplateKey,
          resolvedKey: parentTemplateKey,
          description: item.description,
          error,
        });
      }
    }
  }

  console.log("✅ WBS line item template seeding completed", {
    successCount,
    skippedCount,
    failureCount,
    total: newSubTasks.length,
  });

  if (failureCount > 0) {
    throw new Error(
      `Line item seeding failed for ${failureCount} records. See logs above.`
    );
  }
}

// ─────────────────────────────────────────────

async function main() {
  try {
    await seedWbsLineItemTemplates();
  } catch (err) {
    console.error("❌ Seed script failed", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
