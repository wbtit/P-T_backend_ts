import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { COService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { coHtmlContent } from "../../../services/mailServices/mailtemplates/coMailtemplate";
import { UserRole } from "@prisma/client";
import prisma from "../../../config/database/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const coService = new COService();
const CO_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER",
  "CONNECTION_DESIGNER_ADMIN",
  "CLIENT",
  "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR",
  "VENDOR",
  "VENDOR_ADMIN",
];

type ThreadResponseNode = {
  createdAt: Date;
  user?: {
    connectionDesignerId: string | null;
  } | null;
  childResponses?: ThreadResponseNode[];
};

const flattenThreadResponses = (responses: ThreadResponseNode[]): ThreadResponseNode[] => {
  const flattened: ThreadResponseNode[] = [];

  responses.forEach((response) => {
    flattened.push(response);
    if (response.childResponses?.length) {
      flattened.push(...flattenThreadResponses(response.childResponses));
    }
  });

  return flattened;
};

const needsCompanyAttention = (
  responses: ThreadResponseNode[],
  connectionDesignerId: string
) => {
  const flattened = flattenThreadResponses(responses);
  if (flattened.length === 0) return true;

  const latestResponse = flattened.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];

  return latestResponse.user?.connectionDesignerId !== connectionDesignerId;
};

export class COController {
  // ------------------- CO CREATION & UPDATE -------------------

  async handleCreateCo(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id } = req.user;
    console.log("The files from the request are:",req.files)
    if (!id) throw new AppError("User not found", 404);

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "changeorder"
    );

    const co = await coService.createCo(
      { ...req.body, files: uploadedFiles },
      id
    );
    const coAny = co as any;
    const coEmails = [
      ...(coAny.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
      coAny.Recipients?.email,
    ].filter(Boolean) as string[];
    const uniqueCoEmails = Array.from(new Set(coEmails));
    const creatorId = id;
    const coSubject = `Change Order ${co.changeOrderNumber || ""} - ${co.description || ""}`.trim();
    const coHtml = coHtmlContent(coAny);
    const coNumberForMeta = co.changeOrderNumber?.trim();

    // Background non-blocking tasks
    (async () => {
      try {
        if (uniqueCoEmails.length > 0) {
          const ccEmails = await getCCEmails();
          await sendEmail({
            to: uniqueCoEmails.join(","),
            cc: ccEmails,
            subject: coSubject,
            html: coHtml,
          });
        }
        await notifyProjectStakeholdersByRole(co.project, CO_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "CO_CREATED",
            basePayload: { coId: co.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Change Order Received", message: coNumberForMeta ? `Change order '${coNumberForMeta}' was received for your action.` : "A change order was received for your action." },
              oversight: { title: "Change Order Created / Sent", message: coNumberForMeta ? `Change order '${coNumberForMeta}' was created for monitoring.` : "A change order was created for monitoring." },
              internal: { title: "New Change Order Created", message: coNumberForMeta ? `A new change order '${coNumberForMeta}' was created.` : "A new change order was created." },
              default: { title: "Change Order Created / Sent", message: coNumberForMeta ? `Change order '${coNumberForMeta}' was created.` : "A new Change Order was created." },
            },
          }),
          { excludeUserIds: [creatorId] }
        );
      } catch (error) {
        console.error("Error in handleCreateCo background tasks:", error);
      }
    })();

    res.status(201).json({
      status: "success",
      data: co,
    });
  }
  async handlePendingCOsForClientAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const cos = await coService.pendingCOsForClientAdmin(id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

async handlePendingCOsForClient(req: AuthenticateRequest, res: Response) {  
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    
    const cos = await coService.pendingCOsForClient(id);  
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleUpdateCo(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const { id } = req.params;
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "co"
    );

    const updatedCo = await coService.updateCo(id, {
      ...req.body,
      files: uploadedFiles,
    });
    const updatedCoNumber = updatedCo.changeOrderNumber?.trim();
    const updaterId = req.user.id;
    const bodyStatus = req.body?.status;

    // Background non-blocking tasks
    (async () => {
      try {
        await notifyProjectStakeholdersByRole(updatedCo.project, CO_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "CO_UPDATED",
            basePayload: { coId: updatedCo.id, status: (updatedCo as any).status ?? bodyStatus ?? null, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Change Order Updated", message: updatedCoNumber ? `Updated change order '${updatedCoNumber}' was shared with you.` : "An updated change order was shared with you." },
              oversight: { title: "Change Order Updated", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was updated.` : "A change order was updated." },
              internal: { title: "Change Order Updated", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was updated.` : "A change order was updated." },
              default: { title: "Change Order Updated", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was updated.` : "A Change Order was updated." },
            },
          }),
          { excludeUserIds: [updaterId] }
        );
      } catch (error) {
        console.error("Error in handleUpdateCo background tasks:", error);
      }
    })();

    res.status(200).json({
      status: "success",
      data: updatedCo,
    });
  }

  // ------------------- CO FETCHING -------------------

  async handleGetByProjectId(req: Request, res: Response) {
    const { projectId } = req.params;
    const cos = await coService.getByProjectId(projectId);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleSentCos(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { projectId } = req.params;

    const cos = await coService.sentCos(id, projectId);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleReceivedCos(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { projectId } = req.params;

    const cos = await coService.receivedCos(id, projectId);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleGetById(req: Request, res: Response) {
    const { id } = req.params;
    const co = await coService.findById(id);
    res.status(200).json({
      status: "success",
      data: co,
    });
  }
  // ------------------- CO TABLE -------------------

  async handleCreateCoTable(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { coId } = req.params;

    const coTable = await coService.createCoTable(req.body, coId, id);
    res.status(201).json({
      status: "success",
      data: coTable,
    });
  }

  async handleUpdateCoTableRow(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { id } = req.params;

    const updatedRow = Array.isArray(req.body)
      ? await coService.replaceCoTable(req.body, id, userId)
      : await coService.updateCoTableRow(req.body, id, userId);

    res.status(200).json({
      status: "success",
      data: updatedRow,
    });
  }

  async handleGetCoTableByCoId(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { coId } = req.params;

    const coRows = await coService.getCoTableByCoId(coId, id);
    res.status(200).json({
      status: "success",
      data: coRows,
    });
  }

  // ------------------- FILE HANDLING -------------------

  async handleGetFile(req: Request, res: Response) {
    const { coId, fileId } = req.params;
    const file = await coService.getFile(coId, fileId);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const { coId, fileId } = req.params;
    await coService.viewFile(coId, fileId, res);
  }
  async handlePendingCOs(req: AuthenticateRequest, res: Response) {
   const cos = await coService.pendingCOs();
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handlePendingCOsForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const cos = await coService.pendingCOsForProjectManager(req.user.id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleNewCOsForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const cos = await coService.newCOsForProjectManager(req.user.id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handlePendingCOsForCDAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const connectionDesignerId = req.user.connectionDesignerId;
    if (!connectionDesignerId) {
      throw new AppError("Connection designer is not assigned for this user", 400);
    }

    const cos = await prisma.changeOrder.findMany({
      where: {
        Project: {
          connectionDesignerID: connectionDesignerId,
          isDeleted: false,
          status: { in: ["ACTIVE", "ONHOLD"] },
        },
        OR: [
          { Recipients: { connectionDesignerId } },
          { multipleRecipients: { some: { connectionDesignerId } } },
        ],
      },
      include: {
        coResponses: {
          where: { parentResponseId: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                connectionDesignerId: true,
              },
            },
            childResponses: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    email: true,
                    connectionDesignerId: true,
                  },
                },
              },
            },
          },
        },
        Project: { select: { id: true, name: true, status: true } },
        Recipients: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true },
        },
        multipleRecipients: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        senders: {
          select: { id: true, firstName: true, middleName: true, lastName: true, email: true },
        },
        CoRefersTo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingCOs = cos.filter((co) =>
      needsCompanyAttention(co.coResponses as unknown as ThreadResponseNode[], connectionDesignerId)
    );

    res.status(200).json({
      status: "success",
      data: pendingCOs,
    });
  }
}
