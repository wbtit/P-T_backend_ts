import { Server } from "socket.io";

declare global {
  namespace globalThis {
    var io: Server | undefined;
  }
}

export {};
