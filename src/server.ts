import express from 'express'
import dotenv from "dotenv";
import path from "path";
import { RotatingFileWriter, getRotateConfig } from "./utils/rotatingFileWriter";
dotenv.config();

const rotateConfig = getRotateConfig();
const errorLogWriter = new RotatingFileWriter({
  filePath: path.join(process.cwd(), "logs", "server.err.log"),
  maxBytes: rotateConfig.maxBytes,
  maxFiles: rotateConfig.maxFiles,
});

function formatLogArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }
  if (typeof arg === "string") {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const ts = new Date().toISOString();
  originalConsoleError(`[${ts}]`, ...args);
  errorLogWriter.write(`[${ts}] ${args.map(formatLogArg).join(" ")}\n`);
};

import "./corn-jobs/safeCorn"

import cors from 'cors'
import {
    Request,
    Response,
    NextFunction
} from 'express'
import routes from "./app"
import healthRouter from './system/health'
import openApiRouter from "./openapi/router";


import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import compression from "compression";
import cookieParser from "cookie-parser";
import { metricsMiddleware } from "./middleware/metricsMiddleware";

import {Server} from "socket.io"
import { createServer } from 'http';
import { initSocket } from './sockets/socket';


 export const app =express();

 const server = createServer(app)
const io=new Server(server,{
  cors:{
    origin:"*"
  },
});

(global as any).io = io;


initSocket(io)

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 🚧 Limit request body size (prevents DoS)
app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 🧱 Secure headers
app.use(helmet());

// ⚙️ Compression for performance
app.use(compression());

// 🍪 Cookie parsing (if needed later for JWT/session)
app.use(cookieParser());
app.use(metricsMiddleware);

// ⚡ Rate limit to prevent brute-force
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 min window
  max: 12000, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/v1", apiLimiter);

// 🐢 Slow down after many requests (to deter bots)
const speedLimiter = slowDown({
  windowMs: 10 * 60 * 1000, // 15 minutes
  delayAfter: 6000, // start slowing down after 100 requests
  delayMs: () => 100, // 500ms delay per request after the limit
});
app.use("/v1", speedLimiter);


app.use("/health",healthRouter)
app.use("/v1/docs", openApiRouter);

app.use("/v1",routes)

 // app.ts or server.ts — after all routes
// app.ts or server.ts — after all routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // 🧩 Log error details to the terminal
  console.error("========== 🌋 ERROR LOG START ==========");
  console.error("🕒 Time:", new Date().toISOString());
  console.error("📍 Route:", req.method, req.originalUrl);
  console.error("💬 Message:", message);
  console.error("📄 Stack:", err.stack);
  if (err.errors) {
    console.error("🧾 Validation Errors:", JSON.stringify(err.errors, null, 2));
  }
  console.error("========== 🌋 ERROR LOG END ============\n");

  // ✅ Send clean response to client
  res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});



 const PORT=parseInt(process.env.PORT || '3000', 10)
 server.listen(PORT,()=>{
    console.log(`server running http://localhost:${PORT}`)
 })
