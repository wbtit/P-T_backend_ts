import prisma from "../config/database/client";
import { calculateManagerEstimationScore } from "../services/managerEstimationService";

export async function runMonthlyMEAS() {
    // Get all projects that have managers
    const projects = await prisma.project.findMany({
        where: { managerID: { not: "" } },
        select: { id: true, managerID: true }
    });

    for (const p of projects) {
        console.log(`Calculating MEAS for Manager ${p.managerID} on Project ${p.id}`);
        await calculateManagerEstimationScore(p.managerID, p.id);
    }

    console.log("Monthly MEAS completed.");
}
