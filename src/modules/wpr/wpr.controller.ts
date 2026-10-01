import { Response } from "express";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { AppError } from "../../config/utils/AppError";
import { getProjectWeeks, getReportJson, getReportPdf, listDeliveries } from "./wpr.service";
import { WprRequestUser } from "./wpr.repository";

function requireUser(req: AuthenticateRequest): WprRequestUser {
  if (!req.user) throw new AppError("User not found", 401);
  return { id: req.user.id, role: req.user.role, departmentId: req.user.departmentId ?? null };
}

export class WprController {
  async handleGetWeeks(req: AuthenticateRequest, res: Response) {
    const user = requireUser(req);
    const { projectId } = req.params as { projectId: string };

    const weeks = await getProjectWeeks(projectId, user);
    res.status(200).json({
      status: "success",
      data: weeks.map((w) => ({ index: w.index, label: w.label, start: w.start, end: w.end })),
    });
  }

  async handleGetReportJson(req: AuthenticateRequest, res: Response) {
    const user = requireUser(req);
    const { projectId } = req.params as { projectId: string };
    const { weekEnding } = req.query as { weekEnding?: string };

    const report = await getReportJson(projectId, user, weekEnding);
    res.status(200).json({ status: "success", data: report });
  }

  async handleGetReportPdf(req: AuthenticateRequest, res: Response) {
    const user = requireUser(req);
    const { projectId } = req.params as { projectId: string };
    const { weekEnding } = req.query as { weekEnding?: string };

    const { buffer, filename } = await getReportPdf(projectId, user, weekEnding);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeForContentDisposition(filename)}"`);
    res.setHeader("Content-Length", buffer.length);
    res.status(200).send(buffer);
  }

  async handleListDeliveries(req: AuthenticateRequest, res: Response) {
    requireUser(req); // role-gated in routes.ts; this just ensures auth ran
    const query = req.query as any;
    const result = await listDeliveries(query);
    res.status(200).json({ status: "success", data: result.data, meta: result.meta });
  }
}

/** Strips anything that would break a quoted Content-Disposition filename param. */
function sanitizeForContentDisposition(filename: string): string {
  return filename.replace(/["\r\n]/g, "");
}
