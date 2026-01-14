import nodeCron from "node-cron";
import prisma from "../config/database/client";
import { checkAndSendReminders } from "./checkandsendMail"; 
import { autoCloseStaleTasks, forceCloseStaleTasks } from "./autoCloseTask";
import { check75Alert } from "./check75Alert";
import { checkOverrunAlert } from "./checkOverrunAlert";
import { runMonthlyMEAS } from "./runMonthlyMEAS";  
import {runMonthlyEPS } from "./runMonthlyEPS";
import { sendFollowUpReminders } from "./sendFollowUpReminders";
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
//autoclose stale tasks
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
//75 percent alert cron
async function safeCheck75Alert() {
  const jobName = "check75Alert";
  const lockKey = 123123123; // unique lock key

  const lockAcquired = await acquireLock(lockKey);
  if (!lockAcquired) {
    console.log(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();
  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    console.log(`${jobName}: Started at ${new Date().toISOString()}`);

    await check75Alert();

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
//100 percent overrun alert cron

async function safeCheckOverrunAlert() {
  const lockKey = 222333444;

  if (!(await acquireLock(lockKey))) return;

  const log = await prisma.cronLog.create({ data: { jobName: "checkOverrunAlert" } });
  const start = Date.now();

  try {
    await checkOverrunAlert();
    await prisma.cronLog.update({
      where: { id: log.id },
      data: { status: "SUCCESS", completedAt: new Date(), durationMs: Date.now() - start }
    });
  } catch (err: any) {
    await prisma.cronLog.update({
      where: { id: log.id },
      data: { status: "FAILED", completedAt: new Date(), errorMessage: err.message }
    });
  } finally {
    await releaseLock(lockKey);
  }
}
async function safeMEAS(){
    const lockKey = 555777999; // unique key
    const gotLock = await acquireLock(lockKey);
    if (!gotLock) return console.log("MEAS already running elsewhere.");

    try {
      await runMonthlyMEAS();
    } catch (err) {
      console.error("MEAS job failed", err);
    } finally {
      await releaseLock(lockKey);
    }
} 

async function safeEPS(){
    const lockKey = 666888000; // unique key
    const gotLock = await acquireLock(lockKey);
    if (!gotLock) return console.log("EPS already running elsewhere.");

    try {
      await runMonthlyEPS();
    } catch (err) {
      console.error("EPS job failed", err);
    } finally {
      await releaseLock(lockKey);
    }
}

//force close stale tasks after grace period
async function safeForceCloseTasks() {
  const jobName = "forceCloseTasks";
  const lockKey = 444555666; // unique lock key

  const lockAcquired = await acquireLock(lockKey);
  if (!lockAcquired) {
    console.log(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();
  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    console.log(`${jobName}: Started at ${new Date().toISOString()}`);

    await forceCloseStaleTasks();

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

//communication
async function sendFollowUp() {
  const lockKey = 111222333; // unique key
  const gotLock = await acquireLock(lockKey);
  if (!gotLock) return console.log("Follow-up already running elsewhere.");

  try {
    await sendFollowUpReminders();
  } catch (err) {
    console.error("Follow-up job failed", err);
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
//autoclose
  nodeCron.schedule(
    "*/10 * * * *",
    () => void safeAutoCloseTasks(),
    { timezone: "Asia/Kolkata" }
  );
  //75 percent alert
  nodeCron.schedule(
    "*/10 * * * *",
    () => void safeCheck75Alert(),
    { timezone: "Asia/Kolkata" }
  );
  //100 percent overrun alert
  nodeCron.schedule(
  "*/10 * * * *",
  () => void safeCheckOverrunAlert(),
  { timezone: "Asia/Kolkata" }
);
  //force close stale tasks after grace period
  nodeCron.schedule(
  "*/15 * * * *",
  () => void safeForceCloseTasks(),
  { timezone: "Asia/Kolkata" }
);
//monthly MEAS job
  nodeCron.schedule(
    "0 0 1 * *",
    () => void safeMEAS(),
    { timezone: "Asia/Kolkata" }
  );

//monthly EPS job
  nodeCron.schedule(
    "0 2 1 * *",
    () => void safeEPS(),
    { timezone: "Asia/Kolkata" }
  );
//sendFollowUpMails
  nodeCron.schedule("0 9 * * *", async () => {
  await sendFollowUpReminders();
})
  console.log(" Scheduler started for reminders with DB lock protection.");
} else {
  console.log("⏸ Cron jobs are disabled for this environment.");
}
