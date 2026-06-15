import nodeCron from "node-cron";
import prisma from "../config/database/client";
import { checkAndSendReminders } from "./checkandsendMail"; 
import { autoCloseStaleTasks, forceCloseStaleTasks } from "./autoCloseTask";
import { check75Alert } from "./check75Alert";
import { checkOverrunAlert } from "./checkOverrunAlert";
import { runMonthlyMEAS } from "./runMonthlyMEAS";  
import {runMonthlyEPS } from "./runMonthlyEPS";
import { runMonthlyTES } from "./runMonthlyTES";
import { sendFollowUpReminders } from "./sendFollowUpReminders";
import { runPMOComplition } from "./pmoComplition";
import { processCDFileRetention } from "./cdFileRetention";
import redlock from "../config/redlock";
import { Lock } from "redlock";
import logger from "../utils/logger";

// ───────────────────────────────
// Redis Distributed Lock Helpers 
// ───────────────────────────────
async function acquireLock(lockKey: string | number): Promise<Lock | null> {
  try {
    return await redlock.acquire([`lock:cron:${lockKey}`], 30000);
  } catch (err) {
    // Redlock throws an error if the lock cannot be acquired
    return null;
  }
}

async function releaseLock(lock: Lock): Promise<void> {
  try {
    await lock.release();
  } catch (err) {
    // Swallow the error silently
  }
}

// ───────────────────────────────
// Safe Cron Execution Wrapper
// ───────────────────────────────
async function safeCheckAndSendReminders() {
  const jobName = "checkAndSendReminders";

  // 1. Acquire Redis distributed lock
  const lock = await acquireLock(111222003);
  if (!lock) {
    logger.warn(`🚫 ${jobName}: Another instance is running. Skipping.`);
    return;
  }

  const start = Date.now();

  // 2. Create Cron Log entry
  const log = await prisma.cronLog.create({
    data: { jobName },
  });

  try {
    logger.info(`${jobName}: Started at ${new Date().toISOString()}`);
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

    logger.info(` ${jobName}: Completed successfully.`);
  } catch (err: any) {
    logger.error(` ${jobName}: Failed - ${err.message}`);

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
    await releaseLock(lock);
  }
}

//autoclose stale tasks
async function safeAutoCloseTasks() {
  const jobName = "autoCloseTasks";
  const lockKey = 111222004; // different lock key from your reminders job!

  const lock = await acquireLock(lockKey);
  if (!lock) {
    logger.warn(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();

  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    logger.info(`${jobName}: Started at ${new Date().toISOString()}`);

    await autoCloseStaleTasks(); 

    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "SUCCESS",
        durationMs: Date.now() - start,
      },
    });

    logger.info(` ${jobName}: Completed successfully.`);

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
    await releaseLock(lock);
  }
}

//75 percent alert cron
async function safeCheck75Alert() {
  const jobName = "check75Alert";
  const lockKey = 111222005; // unique lock key

  const lock = await acquireLock(lockKey);
  if (!lock) {
    logger.warn(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();
  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    logger.info(`${jobName}: Started at ${new Date().toISOString()}`);

    await check75Alert();

    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "SUCCESS",
        durationMs: Date.now() - start,
      },
    });

    logger.info(` ${jobName}: Completed successfully.`);
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
    await releaseLock(lock);
  }
}

//100 percent overrun alert cron
async function safeCheckOverrunAlert() {
  const lockKey = 111222006;

  const lock = await acquireLock(lockKey);
  if (!lock) return;

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
    await releaseLock(lock);
  }
}

async function safeMEAS(){
    const lockKey = 111222007; // unique key
    const lock = await acquireLock(lockKey);
    if (!lock) return logger.info("MEAS already running elsewhere.");

    try {
      await runMonthlyMEAS();
    } catch (err) {
      logger.error({ err }, "MEAS job failed");
    } finally {
      await releaseLock(lock);
    }
} 

async function safeEPS(){
    const lockKey = 111222008; // unique key
    const lock = await acquireLock(lockKey);
    if (!lock) return logger.info("EPS already running elsewhere.");

    try {
      await runMonthlyEPS();
    } catch (err) {
      logger.error({ err }, "EPS job failed");
    } finally {
      await releaseLock(lock);
    }
}

async function safeTES(){
    const lockKey = 111222009; // unique key
    const lock = await acquireLock(lockKey);
    if (!lock) return logger.info("TES already running elsewhere.");

    try {
      await runMonthlyTES();
    } catch (err) {
      logger.error({ err }, "TES job failed");
    } finally {
      await releaseLock(lock);
    }
}

//force close stale tasks after grace period
async function safeForceCloseTasks() {
  const jobName = "forceCloseTasks";
  const lockKey = 111222010; // unique lock key

  const lock = await acquireLock(lockKey);
  if (!lock) {
    logger.warn(`🚫 ${jobName}: Another instance running. Skipping.`);
    return;
  }

  const start = Date.now();
  const log = await prisma.cronLog.create({ data: { jobName } });

  try {
    logger.info(`${jobName}: Started at ${new Date().toISOString()}`);

    await forceCloseStaleTasks();

    await prisma.cronLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "SUCCESS",
        durationMs: Date.now() - start,
      },
    });

    logger.info(` ${jobName}: Completed successfully.`);
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
    await releaseLock(lock);
  }
}

// PMO completion alerts
async function safePMOComplition() {
  const lockKey = 111222001; // unique key
  const lock = await acquireLock(lockKey);
  if (!lock) return logger.info("PMO completion already running elsewhere.");

  try {
    await runPMOComplition();
  } catch (err) {
    logger.error({ err }, "PMO completion job failed");
  } finally {
    await releaseLock(lock);
  }
}

//communication
async function sendFollowUp() {
  const lockKey = 111222002; // unique key
  const lock = await acquireLock(lockKey);
  if (!lock) return logger.info("Follow-up already running elsewhere.");

  try {
    await sendFollowUpReminders();
  } catch (err) {
    logger.error({ err }, "Follow-up job failed");
  } finally {
    await releaseLock(lock);
  }
}

// CD File Retention
async function safeCDFileRetention() {
  const lockKey = 111222011; // unique key
  const lock = await acquireLock(lockKey);
  if (!lock) return logger.info("CD File Retention already running elsewhere.");

  try {
    await processCDFileRetention();
  } catch (err) {
    logger.error({ err }, "CD File Retention job failed");
  } finally {
    await releaseLock(lock);
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
//monthly TES job
  nodeCron.schedule(
    "0 3 1 * *",
    () => void safeTES(),
    { timezone: "Asia/Kolkata" }
  );
//sendFollowUpMails
  nodeCron.schedule("0 9 * * *", async () => {
  await sendFollowUpReminders();
});

//PMO completion alerts
  nodeCron.schedule(
    "0 */6 * * *",
    () => void safePMOComplition(),
    { timezone: "Asia/Kolkata" }
  );

// CD File Retention
  nodeCron.schedule(
    "0 1 * * *", // Runs every day at 1:00 AM
    () => void safeCDFileRetention(),
    { timezone: "Asia/Kolkata" }
  );

  logger.info(" Scheduler started for reminders with Redis lock protection.");
} else {
  logger.info("⏸ Cron jobs are disabled for this environment.");
}
