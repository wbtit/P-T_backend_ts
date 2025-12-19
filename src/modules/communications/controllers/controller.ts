import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import {Request,Response} from "express"
import { ClientCommunicationService } from "../services";


const communicationService = new ClientCommunicationService();

export class ClientCommunicationController {
  async create(req: AuthenticateRequest, res: Response) {
    const data = await communicationService.create(
      req.body,
      req.user!.id
    );
    res.status(201).json({ status: "success", data });
  }

  async list(req: Request, res: Response) {
    const data = await communicationService.list(req.query);
    res.json({ status: "success", data });
  }

  async update(req: Request, res: Response) {
    const data = await communicationService.update(
      req.params.id,
      req.body
    );
    res.json({ status: "success", data });
  }

  async complete(req: Request, res: Response) {
    const data = await communicationService.complete(req.params.id);
    res.json({ status: "success", data });
  }
  async getMyFollowUps(req: AuthenticateRequest, res: Response) {
    const data = await communicationService.getMyFollowUps(req.user!.id);
    res.json({ status: "success", data });
  }
}
