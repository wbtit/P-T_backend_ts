import { Server } from "http";
import prisma from "../config/database/client";

export const setupGracefulShutdown = (server: Server) => {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
    
    try {
      // 1. Stop accepting new HTTP requests
      server.close(() => {
        console.log("[Server] HTTP server closed.");
      });

      // 2. Disconnect Prisma to prevent connection leaks
      await prisma.$disconnect();
      console.log("[Server] Prisma disconnected successfully.");
      
      // Note: Future background workers (BullMQ) or Redis connections can also be gracefully closed here!
      
    } catch (err) {
      console.error("[Server] Error during graceful shutdown:", err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
