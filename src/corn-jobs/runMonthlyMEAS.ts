import prisma from "../config/database/client";
import { calculateManagerEstimationScore } from "../services/managerEstimationService";

export async function runMonthlyMEAS() {
    type ProjectManagerPair = { id: string; managerID: string };
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Use raw SQL to avoid Prisma UUID parsing failure on dirty legacy values.
    const rawProjects = await prisma.$queryRaw<ProjectManagerPair[]>`
      SELECT id::text AS id, "managerID"::text AS "managerID"
      FROM "project"
      WHERE "managerID" IS NOT NULL
    `;

    const projects = rawProjects.filter(
        (p) => uuidRegex.test(p.id) && uuidRegex.test(p.managerID)
    );

    const skippedInvalidIds = rawProjects.length - projects.length;
    let processed = 0;
    let skippedNoTasks = 0;
    let failed = 0;

    for (const p of projects) {
        try {
            console.log(`Calculating MEAS for Manager ${p.managerID} on Project ${p.id}`);
            await calculateManagerEstimationScore(p.managerID, p.id);
            processed++;
        } catch (err: any) {
            if (err?.statusCode === 404) {
                skippedNoTasks++;
                console.warn(`Skipping project ${p.id}: ${err.message}`);
                continue;
            }
            failed++;
            console.error(`MEAS failed for manager ${p.managerID} on project ${p.id}`, err);
        }
    }

    const summary = {
        totalFetched: rawProjects.length,
        validProjects: projects.length,
        processed,
        skippedNoTasks,
        skippedInvalidIds,
        failed,
    };

    console.log("Monthly MEAS completed.", summary);
    return summary;
}
