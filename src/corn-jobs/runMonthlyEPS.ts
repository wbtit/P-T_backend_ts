import prisma from "../config/database/client";
import { calculateEPSForEmployee } from "../services/employeePerformanceService";
import { UserRole } from "@prisma/client";

const EPS_ELIGIBLE_ROLES: UserRole[] = [
  "STAFF",
  "ADMIN",
  "SALES_MANAGER",
  "SALES_PERSON",
  "SYSTEM_ADMIN",
  "DEPT_MANAGER",
  "ESTIMATION_HEAD",
  "ESTIMATOR",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "HUMAN_RESOURCE",
];

export async function runMonthlyEPS(year?: number, month?: number) {
  const now = new Date();
  // default behavior: run for previous month
  const previousMonth = now.getMonth(); // 0-based current month
  const previousYear = now.getFullYear();
  let calcMonth = previousMonth === 0 ? 12 : previousMonth;
  let calcYear = previousMonth === 0 ? previousYear - 1 : previousYear;

  if (typeof year === "number" && typeof month === "number") {
    calcYear = year;
    calcMonth = month;
  }

  // get only employee/internal roles (exclude vendor/client-side roles)
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: EPS_ELIGIBLE_ROLES,
      },
    },
    select: { id: true },
  });

  let processed = 0;
  let failed = 0;

  for (const u of users) {
    try {
      console.log(`Calculating EPS for ${u.id} for ${calcYear}-${String(calcMonth).padStart(2,"0")}`);
      await calculateEPSForEmployee(u.id, calcYear, calcMonth);
      processed++;
    } catch (err) {
      failed++;
      console.error(`EPS failed for ${u.id}`, err);
    }
  }

  const summary = {
    period: `${calcYear}-${String(calcMonth).padStart(2, "0")}`,
    totalEligibleUsers: users.length,
    processed,
    failed,
  };
  console.log("Monthly EPS done.", summary);
  return summary;
}
