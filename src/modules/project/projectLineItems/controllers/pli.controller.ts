import { Request,Response } from "express";
import { PLIService } from "../services";
import { Stage } from "@prisma/client";
const projectLineItemService = new PLIService();


export class PLIController{
    async getLineItems(req: Request, res: Response) {
  const { projectWbsId } = req.params;

  const items = await projectLineItemService.getByWbs(projectWbsId);

  res.json({
    status: "success",
    data: items,
  });
}
async updateLineItem(req: Request, res: Response) {
  const { lineItemId } = req.params;

  const item = await projectLineItemService.updateOne(
    lineItemId,
    req.body
  );

  res.json({
    status: "success",
    data: item,
  });
}
async bulkUpdateLineItems(req: Request, res: Response) {
  const { items } = req.body;

  await projectLineItemService.bulkUpdate(items);

  res.json({
    status: "success",
    message: "Line items updated",
  });
}

}