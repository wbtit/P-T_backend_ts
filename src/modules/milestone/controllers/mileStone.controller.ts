import { Request, Response } from "express";
import { MileStoneService } from "../services";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import prisma from "../../../config/database/client";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const mileStoneService = new MileStoneService();
const MILESTONE_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

export class MileStoneController {
  async handleCreate(req: Request, res: Response) {
    console.log("[Milestone][Create] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });

    const result = await mileStoneService.create(req.body);
    await notifyByRoles(MILESTONE_NOTIFY_ROLES, {
      type: "MILESTONE_CREATED",
      title: "Milestone Created",
      message: `Milestone '${result?.subject ?? result?.id}' created.`,
      milestoneId: result?.id,
      timestamp: new Date(),
    });

    return res.status(201).json({
      message: "MileStone created successfully",
      success: true,
      data: result,
    });
  }

  async handleUpdate(req: Request, res: Response) {
    console.log("[Milestone][Update] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const { id } = req.params;
    const payload = req.body?.data ?? req.body;
    const result = await mileStoneService.update(id, payload);
    await notifyByRoles(MILESTONE_NOTIFY_ROLES, {
      type: "MILESTONE_NEW_VERSION",
      title: "New Milestone Version Created",
      message: `A new version was created for milestone '${id}'.`,
      milestoneId: id,
      timestamp: new Date(),
    });

    if (!result) throw new AppError("Failed to update milestone", 400);

    return res.status(200).json({
      message: "MileStone new version created successfully",
      success: true,
      data: result,
    });
  }

  async handleUpdateExisting(req: Request, res: Response) {
    console.log("[Milestone][UpdateExisting] Incoming request", {
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const { id } = req.params;
    const payload = req.body?.data ?? req.body;
    const result = await mileStoneService.updateExisting(id, payload);
    await notifyByRoles(MILESTONE_NOTIFY_ROLES, {
      type: "MILESTONE_UPDATED",
      title: "Milestone Updated",
      message: `Milestone '${id}' was updated.`,
      milestoneId: id,
      timestamp: new Date(),
    });

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

  async handleGetByProjectId(req: Request, res: Response) {
    const { id } = req.params;
    const result = await mileStoneService.getByProjectId(id);

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
}
