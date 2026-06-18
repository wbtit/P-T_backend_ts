// src/socket/initSocket.ts
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import prisma from "../config/database/client";
import { Compression, decompression } from "../utils/Zstd";
import { JWT_SECRET } from "../config/utils/jwtutils";
import { UserJwt } from "../shared/types";

/** ----------------------- Types ----------------------- **/

interface ServerToClientEvents {
  customNotification: (payload: any) => void;
  receivePrivateMessage: (payload: any) => void;
  receiveGroupMessage: (payload: any) => void;
  error: (payload: any) => void;
}

interface ClientToServerEvents {
  privateMessages: (payload: PrivateMessagePayload) => void;
  groupMessages: (payload: GroupMessagePayload) => void;
}

interface InterServerEvents {}

interface SocketData {
  userId?: string;
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

const getSocketUserLabel = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      middleName: true,
      lastName: true,
      username: true,
      role: true,
    },
  });

  if (!user) {
    return userId;
  }

  const fullName = [user.firstName, user.middleName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName = fullName || user.username || userId;

  return `${displayName} [${user.role}] (${userId})`;
};

/** ----------------------- Init Socket ----------------------- **/

export const initSocket = async (
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) => {
  console.log("🚀 Initializing Socket.IO with Redis adapter...");

  // ✅ Redis Pub/Sub adapter for scaling
  const pubClient = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
  const subClient = pubClient.duplicate();
  const redis = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
  
// ✅ Prevent "missing error handler" crashes
for (const client of [pubClient, subClient, redis]) {
  client.on("error", (err) => {
    console.error(`[REDIS ERROR] ${client.commandOptions?.prefix || ""}`, err);
  });
  client.on("end", () => {
    console.warn(`[REDIS DISCONNECTED] A Redis connection was closed`);
  });
  client.on("reconnecting", () => {
    console.log(`[REDIS RECONNECTING] Trying to reconnect...`);
  });
}
  try {
    await pubClient.connect();
    console.log("✅ Redis PubClient connected");
    await subClient.connect();
    console.log("✅ Redis SubClient connected");
    await redis.connect();
    console.log("✅ Redis Mapping Client connected");
  } catch (err) {
    console.error("❌ Failed to connect to Redis:", err);
  }

  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Redis adapter successfully attached to Socket.IO");

  /** ----------------------- Middleware Auth ----------------------- **/
  io.use(async (socket, next) => {
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice("Bearer ".length)
        : undefined);

    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as UserJwt;
        const userLabel = await getSocketUserLabel(decoded.id);
        console.log(`✅ Authenticated socket via JWT for user: ${userLabel}`);
        socket.data.userId = decoded.id;
        return next();
      } catch (err) {
        console.warn("⚠️ Socket JWT authentication failed");
        return next(new Error("Unauthorized: Invalid token"));
      }
    }

    console.warn("⚠️ Connection rejected: Missing auth token in socket handshake");
    return next(new Error("Unauthorized: Missing token"));
  });

  /** ----------------------- Connection ----------------------- **/
  io.on(
    "connection",
    async (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      try {
        const userId = socket.data.userId!;
        const userLabel = await getSocketUserLabel(userId);
        console.log(`🔌 Socket connected for ${userLabel}`);

        socket.join(`user:${userId}`);

        /** ✅ Pending Notifications **/
        const pendingNotifications = await prisma.notification.findMany({
          where: { userID: userId, delivered: false },
        });

        if (pendingNotifications.length > 0) {
          console.log(`📬 Delivering ${pendingNotifications.length} pending notifications to ${userLabel}`);
        }

        for (const notification of pendingNotifications) {
          socket.emit("customNotification", notification.payload);
        }

        if (pendingNotifications.length > 0) {
          await prisma.notification.updateMany({
            where: { userID: userId, delivered: false },
            data: { delivered: true },
          });
          console.log(`✅ Marked ${pendingNotifications.length} notifications as delivered`);
        }

        /** ----------------------- Private Messages ----------------------- **/
        socket.on("privateMessages", async ({ content, senderId, receiverId }) => {
          console.log(
            `💬 Private message event received from ${senderId} → ${receiverId}, content: ${content.slice(
              0,
              30
            )}...`
          );

          try {
            const compressedContent = await Compression(content);
            console.log("📦 Message compressed successfully");

            const message = await prisma.message.create({
              data: {
                contentCompressed: compressedContent,
                senderId,
                receiverId,
              },
            });
            console.log(`✅ Message stored in DB with ID: ${message.id}`);

            const decompressed = await decompression(compressedContent);
            console.log("📤 Decompressed content ready to send to receiver");

            io.to(`user:${receiverId}`).emit("receivePrivateMessage", {
              ...message,
              content: decompressed,
            });
            console.log(`📡 Sent private message to receiver room user:${receiverId}`);

            // ✅ Check receiver sockets natively via Redis Adapter
            const receiverSockets = await io.in(`user:${receiverId}`).fetchSockets();
            console.log(`🔍 Receiver active connections:`, receiverSockets.length);

            if (receiverSockets.length === 0) {
              console.log("⚠️ Receiver appears offline, storing notification...");
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
              console.log("✅ Notification stored for offline receiver");
            } else {
              console.log("✅ Receiver online, message delivered in real-time");
            }
          } catch (err) {
            console.error("❌ Error in privateMessages handler:", err);
          }
        });

        /** ----------------------- Group Messages ----------------------- **/
        socket.on("groupMessages", async ({ content, groupId, senderId, taggedUserIds = [] }) => {
          console.log(
            `👥 Group message from ${senderId} in group ${groupId} | tagged: ${taggedUserIds.join(", ")}`
          );

          try {
            // ✅ Validate group exists
            const groupExists = await prisma.group.findUnique({
              where: { id: groupId },
            });

            if (!groupExists) {
              console.error(`❌ Group ${groupId} does not exist`);
              return socket.emit("error", { message: "Group not found" });
            }

            const compressedContent = await Compression(content);
            console.log("📦 Group message compressed");

            const message = await prisma.message.create({
              data: {
                contentCompressed: compressedContent,
                senderId,
                groupId,
                taggedUsers: {
                  connect: taggedUserIds.map((id) => ({ id })),
                },
              },
              include: { taggedUsers: true },
            });
            console.log(`✅ Group message stored with ID: ${message.id}`);

            const groupMembers = await prisma.groupUser.findMany({
              where: { groupId },
              select: { memberId: true },
            });
            console.log(`👥 Group has ${groupMembers.length} members`);

            const decompressed = await decompression(compressedContent);
            console.log("📤 Decompressed group message for sending");

            const notificationsData: any[] = [];

            for (const member of groupMembers) {
              if (member.memberId === senderId) continue;

              const isTagged = taggedUserIds.includes(member.memberId);
              const payload = { ...message, content: decompressed, isTagged };

              const memberSockets = await io.in(`user:${member.memberId}`).fetchSockets();
              console.log(`🔍 Member ${member.memberId} active connections:`, memberSockets.length);

              if (memberSockets.length > 0) {
                io.to(`user:${member.memberId}`).emit("receiveGroupMessage", payload);
                console.log(`📡 Sent group message to member ${member.memberId}`);
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

            if (notificationsData.length > 0) {
              await prisma.notification.createMany({ data: notificationsData });
              console.log(`💾 Stored ${notificationsData.length} group notifications for offline users`);
            }
          } catch (err) {
            console.error("❌ Error in groupMessages handler:", err);
          }
        });

        /** ----------------------- Disconnect ----------------------- **/
        socket.on("disconnect", async (reason) => {
          try {
            const userId = socket.data.userId;
            if (userId) {
              const userLabel = await getSocketUserLabel(userId);
              
              // Note: Upon disconnect, the socket has already left the room locally,
              // but we need to check if there are OTHER sockets still in the room globally.
              const activeSockets = await io.in(`user:${userId}`).fetchSockets();
              
              if (activeSockets.length === 0) {
                console.log(`⏸️ Last socket disconnected for ${userLabel}. Pausing tasks...`);
                try {
                  const { WHService } = await import("../modules/workingHours/services/wh.services");
                  const whService = new WHService();
                  await whService.pauseAllTasksForUser(userId);
                } catch (pauseErr) {
                  console.error("❌ Failed to pause tasks on disconnect:", pauseErr);
                }
              }

              console.log(`🔌 Socket disconnected for ${userLabel} | reason: ${reason}`);
            }
          } catch (err) {
            console.error("❌ Error during disconnect cleanup:", err);
          }
        });
      } catch (err) {
        console.error("❌ Error in socket connection handler:", err);
      }
    }
  );

  console.log("✅ Socket.IO setup complete and waiting for connections.");
};
