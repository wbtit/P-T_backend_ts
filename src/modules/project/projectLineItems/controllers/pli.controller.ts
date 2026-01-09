import { Request, Response } from "express";
import { PLIService } from "../services";
import { AppError } from "../../../../config/utils/AppError";

const projectLineItemService = new PLIService();

export class PLIController {
  async getLineItems(req: Request, res: Response) {
    const { projectId, projectWbsId } = req.params;

    const items = await projectLineItemService.getByWbs(
      projectId,
      projectWbsId
    );

    res.status(200).json({
      status: "success",
      data: items,
    });
  }

  async updateLineItem(req: Request, res: Response) {
    const { projectId, lineItemId } = req.params;

    const item = await projectLineItemService.updateOne(
      projectId,
      lineItemId,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: item,
    });
  }

  async bulkUpdateLineItems(req: Request, res: Response) {
    const { projectId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      throw new AppError("Items must be an array", 400);
    }

    await projectLineItemService.bulkUpdate(projectId, items);

    res.status(200).json({
      status: "success",
      message: "Line items updated successfully",
    });
  }
}
