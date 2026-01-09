import prisma from "../config/database/client";
import { wbsBundleTemplates } from "../config/data/wbsBundleData";
import { Activity, Stage } from "@prisma/client";

export async function seedWbsBundleTemplates() {
  for (const bundle of wbsBundleTemplates) {
    await prisma.wbsBundleTemplate.upsert({
      where: { bundleKey: bundle.bundleKey },
      update: {
        name: bundle.name,
        category: bundle.category as Activity,
        stage: bundle.stage as Stage,
        isActive: true,
      },
      create: {
        id: crypto.randomUUID(),
        bundleKey: bundle.bundleKey,
        name: bundle.name,
        category: bundle.category as Activity,
        stage: bundle.stage as Stage,
      },
    });
  }
}
// Add this at the end of wbsBundleSeedingScript.ts
async function main() {
  try {
    await seedWbsBundleTemplates();
    console.log("Seeding completed successfully");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
