import redis from "../redis/redisClient";
import prisma from "../config/database/client";
import { enrichNotificationPayloadWithProject } from "./projectNotificationPayload";

/**
 * Send notification to a user using the new socket architecture.
 * Works for users with multiple sockets & stores notifications if offline.
 */

export const sendNotification = async (userId:string, payload:any) => {
  try {
    console.log(` Attempting to send notification to user ${userId}`);
    const enrichedPayload = await enrichNotificationPayloadWithProject(payload);

    // Get all active socket connections for the user
    const socketIds = await redis.sMembers(`socket:${userId}`);
    const userIsOnline = Array.isArray(socketIds) && socketIds.length > 0;

    let delivered = false;

    if (userIsOnline && (globalThis as any).io) {
      console.log(
        ` User ${userId} is ONLINE → Sending to room user:${userId} (${socketIds.length} sockets)`
      );

      // Emit to all sockets belonging to this user
      (globalThis as any).io.to(`user:${userId}`).emit("customNotification", enrichedPayload);
      delivered = true;
    } else {
      console.warn(` User ${userId} OFFLINE → will store undelivered notification`);
      delivered = false;
    }

    // Save notification record with correct delivered status
    await prisma.notification.create({
      data: {
        userID: userId,
        payload: enrichedPayload,
        delivered, // dynamically set
      },
    });

    console.log(
      `Notification stored for user ${userId} | delivered: ${delivered ? "YES" : "NO"}`
    );
  } catch (err) {
    console.error(" Error in sendNotification:", err);
  }
};
