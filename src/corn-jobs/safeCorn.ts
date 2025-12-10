import nodeCron from "node-cron";
import prisma from "../config/database/client";
import { checkAndSendReminders } from "./checkandsendMail"; 
import { autoCloseStaleTasks } from "./autoCloseTask";

// ───────────────────────────────
// Advisory Lock Helper Functions 
// ───────────────────────────────
async function acquireLock(lockKey = 987654321): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
      SELECT pg_try_advisory_lock(${lockKey});
    `;
    return result[0]?.pg_try_advisory_lock ?? false;
  } catch (err) {
    console.error(" Failed to acquire lock:", err);
    return false;
  }
}

async function releaseLock(lockKey = 987654321): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey});`;
  } catch (err) {
    console.error(" Failed to release lock:", err);
  }
}

// ───────────────────────────────
// Safe Cron Execution Wrapper
// ───────────────────────────────
async function safeCheckAndSendReminders() {
  const jobName = "checkAndSendReminders";

  // 1. Acquire DB advisory lock
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    console.log(`🚫 ${jobName}: Another instance is running. Skipping.`);
    return;
  }

  const start = Date.now();

  // 2. Create Cron Log entry
  const log = await prisma.cronLog.create({
    data: { jobName },
  });

  try {
    console.log(`${jobName}: Started at ${new Date().toISOString()}`);
    await checkAndSendReminders();

    // 3. Update success log
    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "SUCCESS",
        durationMs: Date.now() - start,
      },
    });

    console.log(` ${jobName}: Completed successfully.`);
  } catch (err: any) {
    console.error(` ${jobName}: Failed - ${err.message}`);

    // 4. Update failed log
    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "FAILED",
        errorMessage: err.message,
        durationMs: Date.now() - start,
      },
    });
  } finally {
    // 5. Always release lock
    await releaseLock();
  }
}
async function safeAutoCloseTasks() {
  const jobName = "autoCloseTasks";
  const lockKey = 123456789; // different lock key from your reminders job!

  const lockAcquired = await acquireLock(lockKey);
  if (!lockAcquired) {
    console.log(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();

  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    console.log(`${jobName}: Started at ${new Date().toISOString()}`);

    await autoCloseStaleTasks(); 

    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "SUCCESS",
        durationMs: Date.now() - start,
      },
    });

    console.log(` ${jobName}: Completed successfully.`);

  } catch (err: any) {

    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "FAILED",
        errorMessage: err.message,
        durationMs: Date.now() - start,
      },
    });

  } finally {
    await releaseLock(lockKey);
  }
}

// ───────────────────────────────
// CRON SCHEDULER (Every minute)
// ───────────────────────────────
if (process.env.ENABLE_CRON === "true") {
  nodeCron.schedule(
    "*/1 * * * *",
    () => void safeCheckAndSendReminders(),
    { timezone: "Asia/Kolkata" }
  );

  nodeCron.schedule(
    "*/10 * * * *",
    () => void safeAutoCloseTasks(),
    { timezone: "Asia/Kolkata" }
  );

  console.log(" Scheduler started for reminders with DB lock protection.");
} else {
  console.log("⏸ Cron jobs are disabled for this environment.");
}
