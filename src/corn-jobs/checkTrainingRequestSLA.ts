import prisma from "../config/database/client";
import { acquireLock, releaseLock } from "./safeCorn"; 
import { sendNotification } from "../utils/sendNotification";
import logger from "../utils/logger";

const LOCK_KEY = "111222011";

export async function checkTrainingRequestSLA() {
  const lock = await acquireLock(LOCK_KEY);
  if (!lock) {
    logger.info("checkTrainingRequestSLA lock acquired by another instance. Skipping.");
    return;
  }

  try {
    const SLA_HOURS = 48;
    const cutoff = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);

    const overdue = await prisma.trainingRequest.findMany({
      where: {
        status: "PENDING",
        requestedAt: { lt: cutoff }
      },
      include: { task: { include: { department: true, project: true } } }
    });

    if (overdue.length === 0) return;

    const topLevelAdmins = await prisma.user.findMany({
      where: { 
        role: { in: ["ADMIN", "OPERATION_EXECUTIVE"] }, 
        isActive: true 
      },
      select: { id: true }
    });

    for (const request of overdue) {
      const payload = {
        type: "TRAINING_REQUEST_SLA_BREACH",
        title: "Training Request SLA Breach",
        message: `Training request for topic '${request.topic}' has breached the 48-hour SLA without resolution.`,
        requestId: request.id,
        taskId: request.taskId,
        timestamp: new Date()
      };

      for (const admin of topLevelAdmins) {
        await sendNotification(admin.id, payload);
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Error checking Training Request SLA");
  } finally {
    await releaseLock(lock);
  }
}
