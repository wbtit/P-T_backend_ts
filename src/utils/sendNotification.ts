import redis from "../redis/redisClient.js";
import prisma from "../config/database/client.js";

/**
 * Send notification to a user using the new socket architecture.
 * Works for users with multiple sockets & stores notifications if offline.
 */

export const sendNotification = async (userId:string, payload:any) => {
  try {
    console.log(` Attempting to send notification to user ${userId}`);

    // Get all active socket connections for the user
    const socketIds = await redis.sMembers(`socket:${userId}`);
    const userIsOnline = Array.isArray(socketIds) && socketIds.length > 0;

    let delivered = false;

    if (userIsOnline && globalThis.io) {
      console.log(
        ` User ${userId} is ONLINE → Sending to room user:${userId} (${socketIds.length} sockets)`
      );

      // Emit to all sockets belonging to this user
      globalThis.io.to(`user:${userId}`).emit("customNotification", payload);
      delivered = true;
    } else {
      console.warn(` User ${userId} OFFLINE → will store undelivered notification`);
      delivered = false;
    }

    // Save notification record with correct delivered status
    await prisma.notification.create({
      data: {
        userID: userId,
        payload,
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
