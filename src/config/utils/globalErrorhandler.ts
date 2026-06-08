import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError"; // adjust path if needed

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV === "development";
  const statusCode = (err as any).statusCode;
  const is4xx = typeof statusCode === "number" && statusCode >= 400 && statusCode < 500;

  // 🧩 Structured error log for terminal
  console.error("========== 🌋 ERROR LOG START ==========");
  console.error("🕒 Time:", new Date().toISOString());
  console.error("📍 Route:", req.method, req.originalUrl);
  console.error("👤 User:", (req as any).user?.id || "Unauthenticated");
  console.error("💬 Message:", err.message);
  if (!is4xx) {
    console.error("📄 Stack:", err.stack);
  }
  if ((err as any).errors) {
    console.error(
      "🧾 Validation Errors:",
      JSON.stringify((err as any).errors, null, 2)
    );
  }
  console.error("========== 🌋 ERROR LOG END ============\n");

  // 🔹 Handle custom error classes with statusCode
  if (typeof statusCode === "number") {
    return res.status(statusCode).json({
      status: "error",
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  // 🔹 Handle Zod validation errors
  if ((err as any).errors && Array.isArray((err as any).errors)) {
    return res.status(400).json({
      status: "fail",
      message: "Validation error",
      errors: (err as any).errors,
    });
  }

  // 🔹 Handle unexpected errors
  return res.status(500).json({
    status: "error",
    message: err.message || "Something went wrong",
    ...(isDev && { stack: err.stack }),
  });
};
