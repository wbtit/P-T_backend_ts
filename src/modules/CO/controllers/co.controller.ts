import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { ForbiddenError } from "../../../utils/errors";
import { COService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { sendEmail, getCCEmails, getEmailsByRoles } from "../../../services/mailServices/mailconfig";
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
  "CLIENT_ACCOUNTANT",
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
        const internalRoles: UserRole[] = ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER"];
        const internalEmails = await getEmailsByRoles(internalRoles);

        if (co.isAproovedByAdmin === true) {
          if (uniqueCoEmails.length > 0) {
            await sendEmail({
              to: uniqueCoEmails.join(","),
              cc: internalEmails,
              subject: coSubject,
              html: coHtml,
            });
          }
        } else {
          if (internalEmails.length > 0) {
            await sendEmail({
              to: internalEmails.join(","),
              subject: `[Pending Approval] ${coSubject}`,
              html: coHtml,
            });
          }
        }
        const rolesToNotify = co.isAproovedByAdmin === true
          ? CO_NOTIFY_ROLES
          : CO_NOTIFY_ROLES.filter((role) => !role.startsWith("CLIENT"));

        await notifyProjectStakeholdersByRole(co.project, rolesToNotify, (role) =>
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
  async handleClientSidePendingCOs(req: AuthenticateRequest, res: Response) {
    if (
      req.user?.role !== "ADMIN" &&
      req.user?.role !== "OPERATION_EXECUTIVE" &&
      req.user?.role !== "DEPUTY_MANAGER" &&
      req.user?.role !== "DEPT_MANAGER" &&
      req.user?.role !== "PROJECT_MANAGER"
    ) {
      throw new AppError("Access denied", 403);
    }
    const cos = await coService.clientSidePendingCOs();
    res.status(200).json({
      status: "success",
      data: cos,
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
    const { id: userId } = req.user;
    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "co"
    );

    const existingCo = await coService.findById(id);

    if (req.user?.role === "CLIENT_ADMIN") {
      const fabricators = await prisma.fabricator.findMany({
        where: {
          pointOfContact: {
            some: { id: req.user.id, role: "CLIENT_ADMIN" },
          },
        },
        select: { id: true },
      });
      const fabricatorIds = fabricators.map((f) => f.id);
      if (!fabricatorIds.includes(existingCo.Project.fabricatorID)) {
        throw new AppError("Access denied: This change order does not belong to your fabricator", 403);
      }
    } else if (req.user?.role === "CLIENT") {
      const project = await prisma.project.findFirst({
        where: {
          id: existingCo.project,
          clientProjectManagers: { some: { id: req.user.id } }
        }
      });
      if (!project) {
        throw new AppError("Access denied: You are not assigned to this project", 403);
      }
    }

    const updatedCo = await coService.updateCo(id, {
      ...req.body,
      files: uploadedFiles,
    }, userId);
    const updatedCoNumber = updatedCo.changeOrderNumber?.trim();
    const updaterId = req.user.id;
    const bodyStatus = req.body?.status;

    const approvalWasGranted = !existingCo.isAproovedByAdmin && updatedCo.isAproovedByAdmin === true;

    // Background non-blocking tasks
    (async () => {
      try {
        if (approvalWasGranted) {
          const coAny = updatedCo as any;
          const coEmails = [
            ...(coAny.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
            coAny.Recipients?.email,
          ].filter(Boolean) as string[];
          const uniqueCoEmails = Array.from(new Set(coEmails));
          const coSubject = `Change Order ${updatedCo.changeOrderNumber || ""} - ${updatedCo.description || ""}`.trim();
          const coHtml = coHtmlContent(coAny);

          const internalRoles: UserRole[] = ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER"];
          const internalEmails = await getEmailsByRoles(internalRoles);

          if (uniqueCoEmails.length > 0) {
            await sendEmail({
              to: uniqueCoEmails.join(","),
              cc: internalEmails,
              subject: coSubject,
              html: coHtml,
            });
          }

          await notifyProjectStakeholdersByRole(updatedCo.project, CO_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "CO_CREATED",
              basePayload: { coId: updatedCo.id, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "Change Order Received", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was received for your action.` : "A change order was received for your action." },
                oversight: { title: "Change Order Created / Sent", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was created for monitoring.` : "A change order was created for monitoring." },
                internal: { title: "New Change Order Created", message: updatedCoNumber ? `A new change order '${updatedCoNumber}' was created.` : "A new change order was created." },
                default: { title: "Change Order Created / Sent", message: updatedCoNumber ? `Change order '${updatedCoNumber}' was created.` : "A new Change Order was created." },
              },
            }),
            { excludeUserIds: [updaterId] }
          );
        }

        const rolesToNotify = updatedCo.isAproovedByAdmin === true
          ? CO_NOTIFY_ROLES
          : CO_NOTIFY_ROLES.filter((role) => !role.startsWith("CLIENT"));

        await notifyProjectStakeholdersByRole(updatedCo.project, rolesToNotify, (role) =>
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

  async handleGetByProjectId(req: AuthenticateRequest, res: Response) {
    const { projectId } = req.params;
    let cos = await coService.getByProjectId(projectId);

    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      cos = cos.filter(co => co.isAproovedByAdmin === true);
    }

    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handleSentCos(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    const { projectId } = req.params;

    let cos = await coService.sentCos(id, projectId);
    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      cos = cos.filter(co => co.isAproovedByAdmin === true);
    }

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

  async handleGetById(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const co = await coService.findById(id);

    if ((req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") && co.isAproovedByAdmin !== true) {
      throw new AppError("You do not have permission to view this change order until it is approved", 403);
    }

    if (req.user?.role === "CLIENT_ADMIN") {
      const fabricators = await prisma.fabricator.findMany({
        where: {
          pointOfContact: {
            some: { id: req.user.id, role: "CLIENT_ADMIN" },
          },
        },
        select: { id: true },
      });
      const fabricatorIds = fabricators.map((f) => f.id);
      if (!fabricatorIds.includes(co.Project.fabricatorID)) {
        throw new AppError("Access denied: This change order does not belong to your fabricator", 403);
      }
    } else if (req.user?.role === "CLIENT") {
      const project = await prisma.project.findFirst({
        where: {
          id: co.project,
          clientProjectManagers: { some: { id: req.user.id } }
        }
      });
      if (!project) {
        throw new AppError("Access denied: You are not assigned to this project", 403);
      }
    }

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
    const { changeOrderVersionId } = req.query;

    const coTable = await coService.createCoTable(req.body, coId, id, changeOrderVersionId as string);
    res.status(201).json({
      status: "success",
      data: coTable,
    });
  }

  async handleUpdateCoTableRow(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id: userId } = req.user;
    const { id } = req.params;
    const { changeOrderVersionId } = req.query;

    const updatedRow = Array.isArray(req.body)
      ? await coService.replaceCoTable(req.body, id, userId, changeOrderVersionId as string)
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
    const { changeOrderVersionId } = req.query;

    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      const co = await coService.findById(coId);
      if (co?.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view this change order table until it is approved", 403);
      }
    }

    const coRows = await coService.getCoTableByCoId(coId, id, changeOrderVersionId as string);
    res.status(200).json({
      status: "success",
      data: coRows,
    });
  }

  // ------------------- FILE HANDLING -------------------

  async handleGetFile(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { coId, fileId } = req.params;
    const { versionId } = req.query;

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = await coService.findById(coId);
      if (co?.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view files for this change order until it is approved", 403);
      }
    }

    const file = await coService.getFile(coId, fileId, versionId as string);
    res.status(200).json({
      status: "success",
      data: file,
    });
  }

  async handleViewFile(req: Request, res: Response) {
    const authReq = req as AuthenticateRequest;
    const { coId, fileId, versionId } = req.params;

    if (authReq.user?.role === "CLIENT" || authReq.user?.role === "CLIENT_ADMIN") {
      const co = await coService.findById(coId);
      if (co?.isAproovedByAdmin !== true) {
        throw new AppError("You do not have permission to view files for this change order until it is approved", 403);
      }
    }

    await coService.viewFile(coId, fileId, res, versionId);
  }
  async handlePendingCOs(req: AuthenticateRequest, res: Response) {
    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      throw new ForbiddenError("Access denied");
    }
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

  async handlePendingCOsForDepartmentManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const cos = await coService.pendingCOsForDepartmentManager(req.user.id);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }

  async handlePendingCOsForOperationExecutive(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const cos = await coService.pendingCOs();
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

  async handleGetUnapprovedCOs(req: AuthenticateRequest, res: Response) {
    if (req.user?.role === "CLIENT" || req.user?.role === "CLIENT_ADMIN") {
      throw new AppError("Access denied", 403);
    }
    const { projectId } = req.query;
    const cos = await coService.getUnapprovedCOs(projectId as string);
    res.status(200).json({
      status: "success",
      data: cos,
    });
  }
}
