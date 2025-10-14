import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import redis from "../redis/redisClient";
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

interface SocketData {}

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
  // Setup Redis Pub/Sub for socket.io scaling
  const pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  /** ----------------------- Socket Connection ----------------------- **/
  io.on("connection", async (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`🔌 User connected socketId: ${socket.id}`);

    const userId = socket.handshake.auth?.userId as string | undefined;
    if (!userId) {
      console.log("❌ No userId in handshake — disconnecting socket.");
      return socket.disconnect(true);
    }

    await redis.set(`socket:${userId}`, socket.id);
    console.log(`👤 User ${userId} joined. Socket ID mapped: ${socket.id}`);

    /** ----------------------- Deliver Pending Notifications ----------------------- **/
    const pendingNotifications = await prisma.notification.findMany({
      where: { userID: userId, delivered: false },
    });

    for (const notification of pendingNotifications) {
      socket.emit("customNotification", notification.payload);
      await prisma.notification.update({
        where: { id: notification.id },
        data: { delivered: true },
      });
    }

    /** ----------------------- Private Messages ----------------------- **/
    socket.on("privateMessages", async ({ content, senderId, receiverId }) => {
      const compressedContent = await Compression(content);

      const message = await prisma.message.create({
        data: {
          contentCompressed: compressedContent,
          senderId,
          receiverId,
        },
      });

      const receiverSocketId = await redis.get(`socket:${receiverId}`);
      const decompressed = await decompression(compressedContent);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receivePrivateMessage", {
          ...message,
          content: decompressed,
        });
      } else {
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
    });

    /** ----------------------- Group Messages ----------------------- **/
    socket.on("groupMessages", async ({ content, groupId, senderId, taggedUserIds = [] }) => {
      const compressedContent = await Compression(content);

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

      for (const member of groupMembers) {
        if (member.memberId === senderId) continue;

        const memberSocketId = await redis.get(`socket:${member.memberId}`);
        const isTagged = taggedUserIds.includes(member.memberId);

        const payload = {
          ...message,
          content: decompressed,
          isTagged,
        };

        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupMessage", payload);
        } else {
          await prisma.notification.create({
            data: {
              userID: member.memberId,
              payload: {
                type: "GroupMessages",
                groupId,
                contentCompressed: compressedContent,
                isTagged,
              },
              delivered: false,
            },
          });
        }
      }
    });

    /** ----------------------- Disconnect ----------------------- **/
    socket.on("disconnect", async () => {
      const keys = await redis.keys("socket:*");
      for (const key of keys) {
        const sid = await redis.get(key);
        if (sid === socket.id) {
          await redis.del(key);
          console.log(`🧹 Cleaned socket for ${key}`);
          break;
        }
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
