import { Request, Response } from "express";
import { MileStoneService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import prisma from "../../../config/database/client";
import { notifyProjectStakeholders, notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { sendNotification } from "../../../utils/sendNotification";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const mileStoneService = new MileStoneService();
const MILESTONE_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

const milestoneReference = (milestone?: { subject?: string | null; serialNo?: string | null }) => {
  const subject = milestone?.subject?.trim();
  if (subject) return `"${subject}"`;

  const serialNo = milestone?.serialNo?.trim();
  if (serialNo) return serialNo;

  return "this milestone";
};

export class MileStoneController {
  async handleCreate(req: AuthenticateRequest, res: Response) {
    console.log("[Milestone][Create] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    if (!req.user) throw new AppError("User not found", 404);

    const result = await mileStoneService.create(req.body);
    if (result && result.project_id) {
      const reference = milestoneReference(result ?? undefined);

      await sendNotification(req.user.id, {
        type: "MILESTONE_CREATED",
        title: "Milestone Created",
        message: `You created milestone ${reference}.`,
        milestoneId: result.id,
        timestamp: new Date(),
      });

      await notifyProjectStakeholdersByRole(
        result.project_id,
        MILESTONE_NOTIFY_ROLES,
        (role) => {
          const basePayload = {
            type: "MILESTONE_CREATED",
            milestoneId: result.id,
            timestamp: new Date(),
          };

          if (["CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN"].includes(role)) {
            return {
              ...basePayload,
              title: "Milestone Received",
              message: `Milestone ${reference} was received for your action.`,
            };
          }

          if (["ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER_OFFICER", "OPERATION_EXECUTIVE"].includes(role)) {
            return {
              ...basePayload,
              title: "Milestone Created in Project",
              message: `Milestone ${reference} was created and is available for monitoring.`,
            };
          }

          if (["PROJECT_MANAGER", "TEAM_LEAD", "CONNECTION_DESIGNER_ENGINEER"].includes(role)) {
            return {
              ...basePayload,
              title: "New Milestone Created",
              message: `A new milestone ${reference} was created in the project.`,
            };
          }

          return {
            ...basePayload,
            title: "Milestone Created",
            message: `Milestone ${reference} was created.`,
          };
        },
        {
          excludeUserIds: [req.user.id],
        }
      );
    }

    return res.status(201).json({
      message: "MileStone created successfully",
      success: true,
      data: result,
    });
  }

  async handleUpdate(req: AuthenticateRequest, res: Response) {
    console.log("[Milestone][Update] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const { id } = req.params;
    const payload = req.body?.data ?? req.body;
    const result = await mileStoneService.update(id, payload);
    if (result) {
      const milestone = await prisma.mileStone.findUnique({ where: { id: result.mileStoneId || id } });
      if (milestone) {
        await notifyProjectStakeholdersByRole(milestone.project_id, MILESTONE_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "MILESTONE_NEW_VERSION",
            basePayload: { milestoneId: id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Milestone Version Updated", message: `A new version (v${result.versionNumber}) of milestone ${milestoneReference(result as any)} was shared with you.` },
              oversight: { title: "New Milestone Version Created", message: `A new version (v${result.versionNumber}) was created for milestone ${milestoneReference(result as any)}.` },
              internal: { title: "Milestone Version Updated", message: `A new version (v${result.versionNumber}) was created for milestone ${milestoneReference(result as any)}.` },
            },
          }),
          { excludeUserIds: req.user?.id ? [req.user.id] : [] }
        );
      }
    }

    if (!result) throw new AppError("Failed to update milestone", 400);

    return res.status(200).json({
      message: "MileStone new version created successfully",
      success: true,
      data: result,
    });
  }

  async handleUpdateExisting(req: AuthenticateRequest, res: Response) {
    console.log("[Milestone][UpdateExisting] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const { id } = req.params;
    const payload = req.body?.data ?? req.body;
    const result = await mileStoneService.updateExisting(id, payload);
    if (result) {
      const milestone = await prisma.mileStone.findUnique({ where: { id: (result as any).mileStoneId || id } });
      if (milestone) {
        await notifyProjectStakeholdersByRole(milestone.project_id, MILESTONE_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "MILESTONE_UPDATED",
            basePayload: { milestoneId: id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Milestone Updated", message: `Updated milestone ${milestoneReference(result as any)} was shared with you.` },
              oversight: { title: "Milestone Updated", message: `Milestone ${milestoneReference(result as any)} was updated.` },
              internal: { title: "Milestone Updated", message: `Milestone ${milestoneReference(result as any)} was updated.` },
            },
          }),
          { excludeUserIds: req.user?.id ? [req.user.id] : [] }
        );
      }
    }

    if (!result) throw new AppError("Failed to update existing milestone", 400);

    return res.status(200).json({
      message: "MileStone updated successfully",
      success: true,
      data: result,
    });
  }
  async handleUpdateCompletion(req: Request, res: Response) {
    console.log("[Milestone][UpdateCompletion] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const { id } = req.params;
    const payload = req.body?.data ?? req.body;
    const result = await mileStoneService.updateCompletion(id, payload);

    if (!result) throw new AppError("Failed to update milestone completion status", 400);

    return res.status(200).json({
      message: "MileStone completion status updated successfully",
      success: true,
      data: result,
    });
  }
  async handleGetAll(req: Request, res: Response) {
    const result = await mileStoneService.getAll();

    return res.status(200).json({
      message: "MileStones fetched successfully",
      success: true,
      data: result,
    });
  }

  async handleGetById(req: Request, res: Response) {
    const { id } = req.params;
    const result = await mileStoneService.getById(id);

    if (!result) throw new AppError("MileStone not found", 404);

    return res.status(200).json({
      message: "MileStone fetched successfully",
      success: true,
      data: result,
    });
  }

  async handleGetByProjectId(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const result = await mileStoneService.getByProjectId(id,req.user);

    if (!result || result.length === 0) {
      return res.status(200).json({
        message: "No milestones found for this project",
        success: true,
        data: [],
      });
    }

    return res.status(200).json({
      message: "MileStones fetched successfully",
      success: true,
      data: result,
    });
  }

  async handleDelete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await mileStoneService.delete(id);

    if (!result) throw new AppError("Failed to delete milestone", 400);

    return res.status(200).json({
      message: "MileStone deleted successfully",
      success: true,
    });
  }

  async handleGetPendingSubmittals(req:Request,res:Response){
    const result= await mileStoneService.getPendingSubmittals();

    return res.status(200).json({
      message: "Pending submittals fetched successfully",
      success: true,
      data: result,
    });
  }
  async handleGetPendingSubmittalsByFabricator(req:AuthenticateRequest,res:Response){
    const id = req.user?.id;
    const fabricator =  await prisma.fabricator.findFirst({
      where:{
        pointOfContact:{some:{id:id}}
      }
    })
    const result= await mileStoneService.getPendingSubmittalsByFabricator(fabricator?.id!);

    return res.status(200).json({
      message: "Pending submittals for fabricator fetched successfully",
      success: true,
      data: result,
    });
  }

  async handleGetPendingSubmittalsProjectManager(req:AuthenticateRequest,res:Response){
    const id = req.user?.id;
    const result= await mileStoneService.getPendingSubmittalsProjectManager(id!);

    return res.status(200).json({
      message: "Pending submittals for project manager fetched successfully",
      success: true,
      data: result,
    });
  }  
  


  async handleGetPendingSubmittalsByClient(req:AuthenticateRequest,res:Response){
    const id = req.user?.id;
    const result= await mileStoneService.getPendingSubmittalsByClient(id!);

    return res.status(200).json({
      message: "Pending submittals for client admin fetched successfully",
      success: true,
      data: result,
    });
}

async handleGetPendingSubmittalsByConnectionDesignerEngineer(req:AuthenticateRequest,res:Response){
  const userId = req.user?.id;
  const connectionDesignerId = req.user?.connectionDesignerId;
  

  const result= await mileStoneService.getPendingSubmittalsByConnectionDesignerEngineer({
    userId: userId!,
    connectionDesignerId,
  });

  return res.status(200).json({
    message: "Pending submittals for connection designer engineer fetched successfully",
    success: true,
    data: result,
  });
}

}
