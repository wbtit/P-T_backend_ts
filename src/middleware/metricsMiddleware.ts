import { Request, Response, NextFunction } from "express";
import path from "path";
import { RotatingFileWriter, getRotateConfig } from "../utils/rotatingFileWriter";

const metricsLogDir = path.join(process.cwd(), "logs");
const metricsLogFile = path.join(metricsLogDir, "metrics.ndjson");
const rotateConfig = getRotateConfig();
const metricsLogWriter = new RotatingFileWriter({
  filePath: metricsLogFile,
  maxBytes: rotateConfig.maxBytes,
  maxFiles: rotateConfig.maxFiles,
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
    const fullRoute = req.originalUrl.split("?")[0];
    const payload = {
      ts: new Date().toISOString(),
      method: req.method,
      route: fullRoute,
      status: res.statusCode,
      duration_ms: duration,
    };
    const line = `${JSON.stringify(payload)}\n`;

    metricsLogWriter.write(line);
  });

  next();
}
