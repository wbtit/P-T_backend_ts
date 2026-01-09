import { Request, Response } from "express";
import { WbsLineItemTemplateService } from "../services/wbsLineItemTemplate.services";

const service = new WbsLineItemTemplateService();

export class WbsLineItemTemplateController {
  async create(req: Request, res: Response) {
    const result = await service.create(req.body);
    res.status(201).json({ status: "success", data: result });
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const result = await service.update(id, req.body);
    res.status(200).json({ status: "success", data: result });
  }
}

