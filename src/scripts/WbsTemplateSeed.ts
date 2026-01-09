import { WbsDiscipline } from "@prisma/client";
import newWBSActivity from "../config/data/newWbsActivityData";
import prisma from "../config/database/client";

async function seedWbsTemplates() {
  console.log("🌱 Seeding WBS templates...");

  let successCount = 0;
  let failureCount = 0;

  for (const wbs of newWBSActivity) {
    try {
      await prisma.wbsTemplate.upsert({
        where: {
          templateKey: wbs.templateKey,
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          name: wbs.name,
          discipline: wbs.discipline as WbsDiscipline,
          bundleKey: wbs.bundleKey,
          templateKey: wbs.templateKey,
        },
      });

      successCount++;
    } catch (error) {
      failureCount++;

      console.error("❌ Failed to seed WBS template", {
        templateKey: wbs.templateKey,
        name: wbs.name,
        discipline: wbs.discipline,
        error,
      });
    }
  }

  console.log("✅ WBS template seeding completed", {
    successCount,
    failureCount,
    total: newWBSActivity.length,
  });
}
async function main() {
  try {
    await seedWbsTemplates();
  } catch (err) {
    console.error("❌ Seed script failed", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
