import { Server } from "socket.io";

declare global {
  // Extend globalThis to include io
  var io: Server | undefined;
}

export {};
