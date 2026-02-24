import prisma from "../config/database/client";
import { calculateTeamEfficiencyForTeam } from "../services/teamEfficiencyService";

export async function runMonthlyTES(year?: number, month?: number) {
  const now = new Date();
  const previousMonth = now.getMonth();
  const previousYear = now.getFullYear();

  let calcMonth = previousMonth === 0 ? 12 : previousMonth;
  let calcYear = previousMonth === 0 ? previousYear - 1 : previousYear;

  if (typeof year === "number" && typeof month === "number") {
    calcYear = year;
    calcMonth = month;
  }

  const teams = await prisma.team.findMany({
    where: { isDeleted: false },
    select: { id: true },
  });

  let processed = 0;
  let skippedNoData = 0;
  let failed = 0;

  for (const team of teams) {
    try {
      await calculateTeamEfficiencyForTeam(team.id, calcYear, calcMonth);
      processed++;
    } catch (err: any) {
      if (err?.statusCode === 404) {
        skippedNoData++;
        console.warn(`TES skipped for team ${team.id}: ${err.message}`);
        continue;
      }
      failed++;
      console.error(`TES failed for team ${team.id}`, err);
    }
  }

  const summary = {
    period: `${calcYear}-${String(calcMonth).padStart(2, "0")}`,
    totalTeams: teams.length,
    processed,
    skippedNoData,
    failed,
  };

  console.log("Monthly TES done.", summary);
  return summary;
}
