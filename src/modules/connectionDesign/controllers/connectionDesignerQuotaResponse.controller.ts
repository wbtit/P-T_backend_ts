import { Request, Response } from "express";
import { ConnectionDesignerQuotaResponseService } from "../services";

export class ConnectionDesignerQuotaResponseController {
  responseService = new ConnectionDesignerQuotaResponseService();

  async handleCreateResponse(req: Request, res: Response) {
    const response = await this.responseService.createResponse(req.body);

    return res.status(201).json({
      message: "Connection Designer Quota Response created successfully",
      success: true,
      data: response,
    });
  }

  async handleGetAllResponses(req: Request, res: Response) {
    const responses = await this.responseService.getAllResponses();

    return res.status(200).json({
      message: "Connection Designer Quota Responses fetched successfully",
      success: true,
      data: responses,
    });
  }

  async handleGetResponseById(req: Request, res: Response) {
    const { id } = req.params;
    const response = await this.responseService.getResponseById({ id });

    return res.status(200).json({
      message: "Connection Designer Quota Response fetched successfully",
      success: true,
      data: response,
    });
  }

  async handleGetResponsesByQuotaId(req: Request, res: Response) {
    const { quotaId } = req.params;
    const responses = await this.responseService.getResponsesByQuotaId(quotaId);

    return res.status(200).json({
      message: "Connection Designer Quota Responses fetched successfully",
      success: true,
      data: responses,
    });
  }

  async handleUpdateResponse(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await this.responseService.updateResponse({ id }, req.body);

    return res.status(200).json({
      message: "Connection Designer Quota Response updated successfully",
      success: true,
      data: updated,
    });
  }

  async handleDeleteResponse(req: Request, res: Response) {
    const { id } = req.params;
    await this.responseService.deleteResponse({ id });

    return res.status(200).json({
      message: "Connection Designer Quota Response deleted successfully",
      success: true,
    });
  }
}
