import redis from "../redis/redisClient";
import prisma from "../config/database/client";
import { enrichNotificationPayloadWithProject } from "./projectNotificationPayload";

/**
 * Send notification to a user using the new socket architecture.
 * Works for users with multiple sockets & stores notifications if offline.
 */

export const sendNotification = async (userId: string, payload: any) => {
  try {
    // Optimization: Skip enrichment if already enriched with project data
    const enrichedPayload = (payload.projectName && payload.projectId) 
      ? payload 
      : await enrichNotificationPayloadWithProject(payload);

    // Get all active socket connections for the user from Redis
    const socketIds = await redis.sMembers(`socket:${userId}`);
    const userIsOnline = Array.isArray(socketIds) && socketIds.length > 0;

    let delivered = false;

    if (userIsOnline && (globalThis as any).io) {
      // Emit to the user's dedicated socket room
      (globalThis as any).io.to(`user:${userId}`).emit("customNotification", enrichedPayload);
      delivered = true;
    }

    // Save notification record to DB
    await prisma.notification.create({
      data: {
        userID: userId,
        payload: enrichedPayload,
        delivered,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
       console.log(`Notification for ${userId} | online: ${userIsOnline} | delivered: ${delivered}`);
    }
  } catch (err) {
    console.error("Error in sendNotification:", err);
  }
};
