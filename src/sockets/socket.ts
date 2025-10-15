// src/socket/initSocket.ts
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import prisma from "../config/database/client";
import { Compression, decompression } from "../utils/Zstd";

/** ----------------------- Types ----------------------- **/

interface ServerToClientEvents {
  customNotification: (payload: any) => void;
  receivePrivateMessage: (payload: any) => void;
  receiveGroupMessage: (payload: any) => void;
}

interface ClientToServerEvents {
  privateMessages: (payload: PrivateMessagePayload) => void;
  groupMessages: (payload: GroupMessagePayload) => void;
}

interface InterServerEvents {}

interface SocketData {
  userId?: string; // ✅ store userId directly in socket.data
}

interface PrivateMessagePayload {
  content: string;
  senderId: string;
  receiverId: string;
}

interface GroupMessagePayload {
  content: string;
  groupId: string;
  senderId: string;
  taggedUserIds?: string[];
}

/** ----------------------- Init Socket ----------------------- **/

export const initSocket = async (
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) => {
  // ✅ Redis Pub/Sub adapter for scaling across multiple PM2 instances
  const pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  // ✅ Redis client for mappings
  const redis = createClient({ url: "redis://127.0.0.1:6379" });
  await redis.connect();

  /** ✅ Add middleware authentication before connection **/
  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (!userId) {
      return next(new Error("Unauthorized: No userId"));
    }
    socket.data.userId = userId; // store userId
    next();
  });

  /** ----------------------- Socket Connection ----------------------- **/
  io.on("connection", async (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    try {
      const userId = socket.data.userId!;
      const userKey = `socket:${userId}`;
      const reverseKey = `socketid:${socket.id}`;

      // ✅ Multiple sockets per user
      await redis.sadd(userKey, socket.id);

      // ✅ Reverse lookup for disconnect cleanup
      await redis.set(reverseKey, userId);

      // ✅ Join user room for easy broadcast
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} connected on socket ${socket.id}`);

      /** ✅ Deliver pending notifications */
      const pendingNotifications = await prisma.notification.findMany({
        where: { userID: userId, delivered: false },
      });

      for (const notification of pendingNotifications) {
        socket.emit("customNotification", notification.payload);
      }

      await prisma.notification.updateMany({
        where: { userID: userId, delivered: false },
        data: { delivered: true },
      });

      /** ----------------------- Private Messages ----------------------- **/
      socket.on("privateMessages", async ({ content, senderId, receiverId }) => {
        try {
          const compressedContent = await Compression(content); // ✅ compress once

          const message = await prisma.message.create({
            data: {
              contentCompressed: compressedContent,
              senderId,
              receiverId,
            },
          });

          const decompressed = await decompression(compressedContent);

          // ✅ Emit to all sockets of receiver
          io.to(`user:${receiverId}`).emit("receivePrivateMessage", {
            ...message,
            content: decompressed,
          });

          // ✅ If receiver not online → save notification
          const receiverSockets = await redis.smembers(`socket:${receiverId}`);
          if (Array.isArray(receiverSockets) && receiverSockets.length > 0) {
            await prisma.notification.create({
              data: {
                userID: receiverId,
                payload: {
                  type: "PrivateMessage",
                  contentCompressed: compressedContent,
                  senderId,
                  receiverId,
                  messageId: message.id,
                },
                delivered: false,
              },
            });
          }
        } catch (err) {
          console.error("❌ Error in privateMessages:", err);
        }
      });

      /** ----------------------- Group Messages ----------------------- **/
      socket.on("groupMessages", async ({ content, groupId, senderId, taggedUserIds = [] }) => {
        try {
          const compressedContent = await Compression(content); // ✅ compress once

          const message = await prisma.message.create({
            data: {
              contentCompressed: compressedContent,
              senderId,
              groupId,
              taggedUsers: {
                connect: taggedUserIds.map((id) => ({ id })),
              },
            },
            include: {
              taggedUsers: true,
            },
          });

          const groupMembers = await prisma.groupUser.findMany({
            where: { groupId },
            select: { memberId: true },
          });

          const decompressed = await decompression(compressedContent);

          // ✅ batch notifications for offline users
          const notificationsData: any[] = [];

          for (const member of groupMembers) {
            if (member.memberId === senderId) continue;

            const isTagged = taggedUserIds.includes(member.memberId);
            const payload = { ...message, content: decompressed, isTagged };

            const memberSockets= await redis.smembers(`socket:${member.memberId}`);
            if (Array.isArray(memberSockets) && memberSockets.length > 0) {
              io.to(`user:${member.memberId}`).emit("receiveGroupMessage", payload);
            } else {
              notificationsData.push({
                userID: member.memberId,
                payload: {
                  type: "GroupMessages",
                  groupId,
                  contentCompressed: compressedContent,
                  isTagged,
                },
                delivered: false,
              });
            }
          }

          // ✅ bulk insert notifications for efficiency
          if (notificationsData.length > 0) {
            await prisma.notification.createMany({ data: notificationsData });
          }
        } catch (err) {
          console.error("❌ Error in groupMessages:", err);
        }
      });

      /** ----------------------- Disconnect ----------------------- **/
      socket.on("disconnect", async () => {
        try {
          const reverseKey = `socketid:${socket.id}`;
          const userId = await redis.get(reverseKey);
          if (userId) {
            const userKey = `socket:${userId}`;
            await redis.srem(userKey, socket.id); // ✅ remove socketId from user's set
            await redis.del(reverseKey); // ✅ remove reverse mapping
            console.log(`🧹 Cleaned socket ${socket.id} for user ${userId}`);
          } else {
            console.log(`⚠️ No reverse mapping for ${socket.id}`);
          }
        } catch (err) {
          console.error("❌ Error in disconnect cleanup:", err);
        }
      });
    } catch (err) {
      console.error("❌ Error in socket connection handler:", err);
    }
  });
};
