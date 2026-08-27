import { Request, Response } from "express";
import { FabricatorService } from "../services";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { PaginationQuerySchema } from "../../../utils/pagination";
import { Stage, UserRole } from "@prisma/client";
import { FabricatorClientAdminHandoverSchema } from "../dtos";

export class FabricatorController {
  private readonly fabService = new FabricatorService();
  private readonly fabricatorNotifyRoles: UserRole[] = [
    "ADMIN",
    "SYSTEM_ADMIN",
    "SALES_MANAGER",
    "SALES_PERSON",
    "DEPUTY_MANAGER",
    "PROJECT_MANAGER_OFFICER"
  ];

  async handleCreateFabricator(req: AuthenticateRequest, res: Response) {
    const { body } = req;
    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "fabricators"
    );
    const fabricatPercentage = body.fabricatPercentage ? parseFloat(body.fabricatPercentage) : 0.0;
    const approvalPercentage = body.approvalPercentage ? parseFloat(body.approvalPercentage) : 0.0;
    const paymenTDueDate = body.paymenTDueDate ? parseInt(body.paymenTDueDate, 10) : 0;
    const COPerHourPrice = body.COPerHourPrice ? parseFloat(body.COPerHourPrice) : 0.0;

    body.fabricatPercentage = fabricatPercentage;
    body.approvalPercentage = approvalPercentage;
    body.paymenTDueDate = paymenTDueDate;
    body.COPerHourPrice = COPerHourPrice;
    const payload = {
      ...body,
      files: uploadedFiles,
    };

    const fabricator = await this.fabService.createFabricator(payload, userId);
    await notifyByRoles(this.fabricatorNotifyRoles, {
      type: "FABRICATOR_CREATED",
      title: "Fabricator Created",
      message: `Fabricator '${fabricator.fabName}' was created.`,
      fabricatorId: fabricator.id,
      timestamp: new Date(),
    });

    return res.status(201).json({
      message: "Fabricator created successfully",
      success: true,
      data: fabricator,
    });
  }

  async handleGetAllFabricators(req: Request, res: Response) {
    const pagination = PaginationQuerySchema.parse(req.query);
    
    const search = req.query.search as string | undefined;
    const stage = req.query.stage as string | undefined;
    const contactId = req.query.contactId as string | undefined;

    const result = await this.fabService.getAllFabricators(pagination, { search, stage, contactId });

    const formattedData = result.data.map((fab: any) => {
      const hqBranch = fab.branches?.find((b: any) => b.isHeadquarters);
      return {
        fabName: fab.fabName,
        createdAt: fab.createdAt,
        country: hqBranch ? hqBranch.country : null,
        id: fab.id,
      };
    });

    return res.status(200).json({
      message: "Fabricators fetched successfully",
      success: true,
      data: formattedData,
      meta: result.meta
    });
  }

  async handleGetFabricatorById(req: Request, res: Response) {
    const { id } = req.params;
    const fabricator = await this.fabService.getFabricatorById(id);

    if (!fabricator) throw new AppError("Fabricator not found", 404);

    const formatContact = (user: any) => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      designation: user.designation,
      email: user.email,
      role: user.role
    });

    const sanitizedData = {
      ...fabricator,
      pointOfContact: fabricator.pointOfContact?.map(formatContact),
      wbtFabricatorPointOfContact: fabricator.wbtFabricatorPointOfContact?.map(formatContact),
    };

    delete (sanitizedData as any).project;
    delete (sanitizedData as any).branches;

    return res.status(200).json({
      message: "Fabricator fetched successfully",
      success: true,
      data: sanitizedData,
    });
  }

  async handleGetFabricatorPointOfContact(req: Request, res: Response) {
    const { id } = req.params;
    const data = await this.fabService.getFabricatorPointOfContacts(id);

    return res.status(200).json({
      message: "Fabricator POC fetched successfully",
      success: true,
      data,
    });
  }

  async handleGetFabricatorByCreatedById(req: AuthenticateRequest, res: Response) {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
}
    const fabricators = await this.fabService.getFabricatorByCreatedById(req.user?.id);

    if (!fabricators) throw new AppError("Fabricators not found", 404);

    return res.status(200).json({
      message: "Fabricators fetched successfully",
      success: true,
      data: fabricators,
    });
  }

  async handleUpdateFabricator(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const { body } = req;
    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "fabricators"
    );

    const existingFab = await this.fabService.getFabricatorById(id);
    if (!existingFab) throw new AppError("Fabricator not found", 404);

    const payload = {
      ...body,
      files: uploadedFiles.length > 0 ? [...(existingFab.files as any || []), ...uploadedFiles] : existingFab.files,
    };

    const fabricator = await this.fabService.updateFabricator(id, payload);
    await notifyByRoles(this.fabricatorNotifyRoles, {
      type: "FABRICATOR_UPDATED",
      title: "Fabricator Updated",
      message: `Fabricator '${fabricator.fabName}' was updated.`,
      fabricatorId: fabricator.id,
      timestamp: new Date(),
    });

    return res.status(200).json({
      message: "Fabricator updated successfully",
      success: true,
    });
  }

  async handleDeleteFabricator(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) throw new AppError("createdById is required", 400);

    const fabricator = await this.fabService.getFabricatorById(id);
    await this.fabService.deleteFabricator(id);
    await notifyByRoles(this.fabricatorNotifyRoles, {
      type: "FABRICATOR_DELETED",
      title: "Fabricator Deleted",
      message: fabricator?.fabName?.trim()
        ? `Fabricator '${fabricator.fabName}' was deleted.`
        : "A fabricator was deleted.",
      fabricatorId: id,
      timestamp: new Date(),
    });

    return res.status(200).json({
      message: "Fabricator deleted successfully",
      success: true,
    });
  }

  async handleHandoverClientAdmin(req: AuthenticateRequest, res: Response) {
    const payload = FabricatorClientAdminHandoverSchema.parse(req.body);
    const fabricator = await this.fabService.handoverClientAdmin(payload);

    return res.status(200).json({
      message: "Client admin handover completed successfully",
      success: true,
      data: fabricator,
    });
  }
}
