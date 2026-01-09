import { Request, Response } from "express";
import { WbsBundleTemplateService } from "../services/wbsBundleTemplate.service";

const service = new WbsBundleTemplateService();

export class WbsBundleTemplateController {
  async list(req: Request, res: Response) {
    const data = await service.list();
    res.json({ status: "success", data });
  }

  async create(req: Request, res: Response) {
    const data = await service.create(req.body);
    res.status(201).json({ status: "success", data });
  }

  async update(req: Request, res: Response) {
    const { bundleKey } = req.params;
    const data = await service.update(bundleKey, req.body);
    res.json({ status: "success", data });
  }
}
