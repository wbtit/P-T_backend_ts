import prisma from "../config/database/client";
import { calculateEPSForEmployee } from "../services/employeePerformanceService";

export async function runMonthlyEPS() {
  const now = new Date();
  // run for previous month
  const month = now.getMonth(); // 0-based current month
  const year = now.getFullYear();
  const calcMonth = month === 0 ? 12 : month;
  const calcYear = month === 0 ? year - 1 : year;

  // get all employees who have tasks or are active users
  const users = await prisma.user.findMany({
    where: { /* optionally filter employees only */ },
    select: { id: true },
  });

  for (const u of users) {
    try {
      console.log(`Calculating EPS for ${u.id} for ${calcYear}-${String(calcMonth).padStart(2,"0")}`);
      await calculateEPSForEmployee(u.id, calcYear, calcMonth);
    } catch (err) {
      console.error(`EPS failed for ${u.id}`, err);
    }
  }

  console.log("Monthly EPS done.");
}
