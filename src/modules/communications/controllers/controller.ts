import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import {Request,Response} from "express"
import { ClientCommunicationService } from "../services";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";


const communicationService = new ClientCommunicationService();

export class ClientCommunicationController {
  async create(req: AuthenticateRequest, res: Response) {
    const data = await communicationService.create(
      req.body,
      req.user!.id
    );
    const creatorIdForBg = req.user!.id;
    const commIdForBg = data.id;
    const projIdForBg = data.projectId;

    // Background non-blocking tasks
    (async () => {
      try {
        await notifyProjectStakeholdersByRole(projIdForBg, ["DEPUTY_MANAGER", "OPERATION_EXECUTIVE"], (role) =>
          buildRoleScopedNotification(role, {
            type: "CLIENT_COMM_LOG_CREATED",
            basePayload: { communicationId: commIdForBg, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Client Communication Log Created", message: "A new client communication log was created." },
              oversight: { title: "Client Communication Log Created", message: "A new client communication log was created and is available for monitoring." },
              internal: { title: "Client Communication Log Created", message: "A new client communication log was created." },
            },
          }),
          { excludeUserIds: [creatorIdForBg] }
        );
      } catch (error) {
        console.error("Error in ClientCommunication create background tasks:", error);
      }
    })();
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
