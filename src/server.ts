import express from 'express'
import dotenv from "dotenv";
dotenv.config();

import "./corn-jobs/checkandsendMail"

import cors from 'cors'
import {
    Request,
    Response,
    NextFunction
} from 'express'
import routes from "./app"
import healthRouter from './system/health'
import { globalErrorHandler } from './config/utils/globalErrorhandler';
 export const app =express();

 app.use(cors())
 app.use(express.json())
 app.use(express.urlencoded({ extended: true })); // for urlencoded


app.use("/health",healthRouter)

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



 const PORT=process.env.PORT || 3000
 app.listen(PORT,()=>{
    console.log(`server running http://localhost:${PORT}`)
 })