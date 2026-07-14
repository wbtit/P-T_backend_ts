import { Request, Response } from "express";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { AppError } from "../../../config/utils/AppError";
import { SubmittalService } from "../services";
import { computeSubmittalStatus } from "../utils/statusHelper";
import { getRoleVisibilityFilter } from "../../../utils/roleFilter";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { sendEmail, getCCEmails } from "../../../services/mailServices/mailconfig";
import { submittalhtmlContent } from "../../../services/mailServices/mailtemplates/submittalMailtemplate";
import { notifyProjectStakeholdersByRole, getProjectStakeholderRecipients } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";

const INTERNAL_LOOP_ROLES: UserRole[] = [
  "ADMIN",
  "PROJECT_MANAGER",
  "DEPT_MANAGER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE"
];
import { ProjectAssistService } from "../../project/services/projectAssist.service";
import { sendNotification } from "../../../utils/sendNotification";
import prisma from "../../../config/database/client";
import { buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";
import { getFabricatorNameForUser } from "../../../services/mailServices/mailtemplates/footerHelper";

const submittalService = new SubmittalService();
const projectAssistService = new ProjectAssistService();
const SUBMITTAL_NOTIFY_ROLES: UserRole[] = [
  "ADMIN",
  "DEPT_MANAGER",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
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

export class SubmittalController {

  // --------------------------------------------------
  // CREATE SUBMITTAL + INITIAL VERSION (v1)
  // --------------------------------------------------
  async handleCreateSubmittal(
    req: AuthenticateRequest,
    res: Response
  ) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id: userId, role } = user;
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      req.body.project_id,
      user,
      "CREATE"
    );

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    const isAproovedByAdmin = false;

    const { description, ...submittalData } = req.body;

    if (!description) {
      throw new AppError("Description is required", 400);
    }

    const submittal = await submittalService.createSubmittal(
      submittalData,
      userId,
      isAproovedByAdmin,
      {
        description,
        files: uploadedFiles,
      }
    );

    // Gather all recipient emails (scalar + multipleRecipients)
    const submittalAny = submittal as any;
    const submittalEmails = [
      ...(submittalAny.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
      submittalAny.recepients?.email,
    ].filter(Boolean) as string[];
    const uniqueSubmittalEmails = Array.from(new Set(submittalEmails));

    const creatorId = userId;
    const actorUsername = user.username;

    // Background non-blocking tasks
    (async () => {
      try {
        const { recipientsByRole } = await getProjectStakeholderRecipients(req.body.project_id, INTERNAL_LOOP_ROLES);
        const internalUserIds = Array.from(recipientsByRole.values()).flat();
        const internalUsers = await prisma.user.findMany({
          where: { id: { in: internalUserIds } },
          select: { email: true }
        });
        const internalEmails = Array.from(new Set(internalUsers.map(u => u.email).filter(Boolean))) as string[];

        if (internalEmails.length > 0) {
          const fabricatorName = (await getFabricatorNameForUser(userId, role)) || undefined;
          const ccEmails = await getCCEmails(submittal.project_id);
          await sendEmail({
            to: internalEmails.join(","),
            cc: ccEmails,
            subject: submittal.subject,
            html: submittalhtmlContent(submittal, fabricatorName),
          });
        }
        await notifyProjectStakeholdersByRole(submittal.project_id, INTERNAL_LOOP_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "SUBMITTAL_CREATED",
            basePayload: { submittalId: submittal.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "", message: "" },
              oversight: { title: "Submittal Created / Sent", message: `Submittal '${submittal.subject}' was created and sent for monitoring.` },
              internal: { title: "New Submittal Created", message: `A new submittal '${submittal.subject}' was created in the project.` },
              default: { title: "Submittal Created / Sent", message: `Submittal '${submittal.subject}' was created and sent.` },
            },
          }),
          { excludeUserIds: [creatorId] }
        );
        if (access.isAssist) {
          await sendNotification(access.projectManagerId, {
            type: "PM_ASSIST_SUBMITTAL_CREATED",
            title: "Assist Created Submittal",
            message: `Assist '${actorUsername}' created submittal '${submittal.subject}'.`,
            actorUserId: creatorId,
            actorUsername: actorUsername,
            projectId: req.body.project_id,
            submittalId: submittal.id,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error in handleCreateSubmittal background tasks:", error);
      }
    })();

    res.status(201).json({
      status: "success",
      message: "Submittal created",
      data: submittal,
    });
  }
  async handleClientSidePendingSubmittals(req: AuthenticateRequest, res: Response) {
    if (
      req.user?.role !== "ADMIN" &&
      req.user?.role !== "OPERATION_EXECUTIVE" &&
      req.user?.role !== "DEPUTY_MANAGER" &&
      req.user?.role !== "DEPT_MANAGER" &&
      req.user?.role !== "PROJECT_MANAGER"
    ) {
      throw new AppError("Access denied", 403);
    }
    const pendingSubmittals = await submittalService.getClientSidePendingSubmittals(req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForClientAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    
    const pendingSubmittals = await submittalService.getPendingSubmittalsForClientAdmin(id, req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForClient(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;
    
    const pendingSubmittals = await submittalService.getPendingSubmittalsForClient(id, req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }


  async handlePendingForProjectManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const pendingSubmittals = await submittalService.getPendingSubmittalsForProjectManager(id, req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForDepartmentManager(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);
    const { id } = req.user;

    const pendingSubmittals = await submittalService.getPendingSubmittalsForDepartmentManager(id, req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForOperationExecutive(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const pendingSubmittals = await submittalService.getPendingSubmittals(req.user?.role);
    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }

  async handlePendingForCDAdmin(req: AuthenticateRequest, res: Response) {
    if (!req.user) throw new AppError("User not found", 404);

    const connectionDesignerId = req.user.connectionDesignerId;
    if (!connectionDesignerId) {
      throw new AppError("Connection designer is not assigned for this user", 400);
    }

    const submittals = await prisma.submittals.findMany({
      where: {
        project: {
          connectionDesignerID: connectionDesignerId,
          isDeleted: false,
          status: { in: ["ACTIVE", "ONHOLD"] },
        },
        currentVersionId: { not: null },
        bfaStatus: false,
        OR: [
          { recepients: { connectionDesignerId } },
          { multipleRecipients: { some: { connectionDesignerId } } },
        ],
        ...getRoleVisibilityFilter(req.user?.role),
      },
      include: {
        project: { select: { id: true, name: true, status: true } },
        fabricator: true,
        recepients: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        sender: true,
        versions: {
          orderBy: { versionNumber: "desc" },
        },
        currentVersion: {
          include: {
            responses: {
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
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const pendingSubmittals = submittals.map(item => computeSubmittalStatus(item));

    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }
  // --------------------------------------------------
  // GET PENDING SUBMITTALS FOR RESPONSE
  // --------------------------------------------------
  async handleGetPendingSubmittals(
    req: AuthenticateRequest,
    res: Response
  ) {
       const pendingSubmittals = await submittalService.getPendingSubmittals(req.user?.role);
       

    res.status(200).json({
      status: "success",
      data: pendingSubmittals,
    });
  }
  // --------------------------------------------------
  // CREATE NEW VERSION (CONTENT UPDATE)
  // --------------------------------------------------
  async handleCreateNewVersion(
    req: AuthenticateRequest,
    res: Response
  ) {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);
    
    const { id: submittalId } = req.params;
    const existingSubmittal = await submittalService.getSubmittalById(submittalId, req.user?.role);
    const access = await projectAssistService.assertRfiSubmittalCreateUpdateAccess(
      existingSubmittal.project_id,
      user
    );
    const { description, multipleRecipients } = req.body;
    console.log(req.body);

    if (!description) {
      throw new AppError("Description is required", 400);
    }

    const uploadedFiles = mapUploadedFiles(
      (req.files as Express.Multer.File[]) || [],
      "submittals"
    );

    const version = await submittalService.createNewVersion(
      submittalId,
      {
        description,
        files: uploadedFiles,
        multipleRecipients,
      },
      user.id
    );
    const updaterId = user.id;
    const updaterUsername = user.username;

    // Background non-blocking tasks
    (async () => {
      try {
        await notifyProjectStakeholdersByRole(existingSubmittal.project_id, SUBMITTAL_NOTIFY_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "SUBMITTAL_NEW_VERSION",
            basePayload: { submittalId, versionId: version.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Updated Submittal Received", message: `A new version of submittal '${existingSubmittal.subject ?? "this submittal"}' was shared with you.` },
              oversight: { title: "New Submittal Version Uploaded", message: `A new version of submittal '${existingSubmittal.subject ?? "this submittal"}' was uploaded.` },
              internal: { title: "Submittal Version Updated", message: `A new version of submittal '${existingSubmittal.subject ?? "this submittal"}' was uploaded in the project.` },
              default: { title: "New Submittal Version Uploaded", message: "A new submittal version has been uploaded." },
            },
          }),
          { excludeUserIds: [updaterId] }
        );
        if (access.isAssist) {
          await sendNotification(access.projectManagerId, {
            type: "PM_ASSIST_SUBMITTAL_UPDATED",
            title: "Assist Updated Submittal",
            message: `Assist '${updaterUsername}' uploaded a new version for submittal '${existingSubmittal.subject ?? "this submittal"}'.`,
            actorUserId: updaterId,
            actorUsername: updaterUsername,
            projectId: existingSubmittal.project_id,
            submittalId,
            versionId: version.id,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error in handleCreateNewVersion background tasks:", error);
      }
    })();

    res.status(201).json({
      status: "success",
      message: "New submittal version created",
      data: version,
    });
  }

  // --------------------------------------------------
  // GET SUBMITTAL BY ID (WITH VERSIONS)
  // --------------------------------------------------
  async handleGetSubmittalById(
    req: Request,
    res: Response
  ) {
    const { id } = req.params;

    const submittal = await submittalService.getSubmittalById(id, (req as AuthenticateRequest).user?.role);

    res.status(200).json({
      status: "success",
      data: submittal,
    });
  }

  // --------------------------------------------------
  // LIST SENT SUBMITTALS
  // --------------------------------------------------
  async handleSent(
    req: AuthenticateRequest,
    res: Response
  ) {
    if (!req.user) throw new AppError("User not found", 404);

    const { projectId } = req.params;
    const sent = await submittalService.sent(req.user.id, projectId, req.user.role);

    res.status(200).json({
      status: "success",
      data: sent,
    });
  }

  // --------------------------------------------------
  // LIST RECEIVED SUBMITTALS
  // --------------------------------------------------
  async handleReceived(
    req: AuthenticateRequest,
    res: Response
  ) {
    if (!req.user) throw new AppError("User not found", 404);

    const { projectId } = req.params;
    const received = await submittalService.received(req.user.id, projectId, req.user.role);

    res.status(200).json({
      status: "success",
      data: received,
    });
  }

  // --------------------------------------------------
  // FIND BY PROJECT
  // --------------------------------------------------
  async handleFindByProject(
    req: Request,
    res: Response
  ) {
    const { projectId } = req.params;

    const submittals = await submittalService.findByProject(projectId, (req as AuthenticateRequest).user?.role);

    res.status(200).json({
      status: "success",
      data: submittals,
    });
  }

  // --------------------------------------------------
  // STREAM FILE (VERSION-AWARE)
  // --------------------------------------------------
  async handleViewFile(
    req: AuthenticateRequest,
    res: Response
  ) {
    const { submittalId, versionId, fileId } = req.params;

    const isClient =
      req.user?.role === "CLIENT" ||
      req.user?.role === "CLIENT_ADMIN";

    await submittalService.viewFile(
      submittalId,
      versionId,
      fileId,
      res,
      isClient
    );
  }
  // --------------------------------------------------
  // UPDATE METADATA (e.g. milestoneId)
  // --------------------------------------------------
  async handleUpdateMetadata(req: AuthenticateRequest, res: Response) {
    const { id } = req.params;
    const updateData = req.body;
    const existing = await submittalService.getSubmittalById(id, req.user?.role);
    
    const approvalWasGranted = !existing.isAproovedByAdmin && updateData.isAproovedByAdmin === true;
    if (approvalWasGranted) {
      updateData.approvedById = req.user!.id;
    }

    const updated = await submittalService.updateSubmittalMetadata(id, updateData);

    if (approvalWasGranted) {
      (async () => {
        try {
          const submittalWithRecipients = await prisma.submittals.findUnique({
            where: { id },
            include: { recepients: true, multipleRecipients: true }
          });
          const recipientEmails = [
            ...(submittalWithRecipients?.multipleRecipients?.map((r: any) => r.email).filter(Boolean) || []),
            submittalWithRecipients?.recepients?.email
          ].filter(Boolean) as string[];
          const uniqueRecipientEmails = Array.from(new Set(recipientEmails));

          const updatedSubmittalSubject = (updated as any).subject?.trim?.();
          const updaterId = req.user!.id;
          
          if (uniqueRecipientEmails.length > 0) {
            const projectInfo = await prisma.project.findUnique({
              where: { id: existing.project_id },
              select: { isAwarded: true }
            });
            if (projectInfo?.isAwarded !== false) {
              const fabricatorName = (await getFabricatorNameForUser(updaterId, req.user!.role)) || undefined;
              const ccEmails = await getCCEmails(existing.project_id);
              await sendEmail({
                to: uniqueRecipientEmails.join(","),
                cc: ccEmails,
                subject: updatedSubmittalSubject,
                html: submittalhtmlContent(submittalWithRecipients as any, fabricatorName),
              });
            }
          }

          await notifyProjectStakeholdersByRole(existing.project_id, SUBMITTAL_NOTIFY_ROLES, (role) =>
            buildRoleScopedNotification(role, {
              type: "SUBMITTAL_APPROVED_BY_ADMIN",
              basePayload: { submittalId: id, timestamp: new Date() },
              templates: {
                creator: { title: "", message: "" },
                external: { title: "New Submittal", message: updatedSubmittalSubject ? `New Submittal '${updatedSubmittalSubject}' was approved and is ready for your action.` : "A New Submittal is ready for your action." },
                oversight: { title: "Submittal Approved by Admin", message: updatedSubmittalSubject ? `Submittal '${updatedSubmittalSubject}' was approved by admin.` : "A Submittal was approved by admin." },
                internal: { title: "Submittal Approved", message: updatedSubmittalSubject ? `Submittal '${updatedSubmittalSubject}' was approved in the project.` : "A Submittal was approved in the project." },
                default: { title: "New Submittal", message: updatedSubmittalSubject ? `New Submittal '${updatedSubmittalSubject}' is now available.` : "A New Submittal is now available." },
              },
            }),
            { excludeUserIds: [updaterId] }
          );
        } catch (error) {
          console.error("Failed to send approval notifications:", error);
        }
      })();
    }

    res.status(200).json({
      success: true,
      message: "Submittal metadata updated successfully",
      data: updated,
    });
  }
}
