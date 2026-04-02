import { Response,Request } from "express";
import { ProjectService } from "../services";
import { ProjectAssistService } from "../services/projectAssist.service";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { notifyProjectStakeholdersByRole } from "../../../utils/notifyProjectStakeholders";
import { UserRole } from "@prisma/client";
import { sendNotification } from "../../../utils/sendNotification";
import { buildCreatorNotification, buildRoleScopedNotification } from "../../../utils/stakeholderNotificationMessages";

const projectService = new ProjectService();
const projectAssistService = new ProjectAssistService();
const PROJECT_CREATED_ROLES: UserRole[] = [
  "ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER", "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "ESTIMATION_HEAD", "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN",
];
const PROJECT_STAGE_CHANGED_ROLES: UserRole[] = [
  "ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER", "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "CONNECTION_DESIGNER_ENGINEER", "STAFF",
  "CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN",
];
const PROJECT_ENDDATE_CHANGED_ROLES: UserRole[] = [
  "ADMIN", "DEPT_MANAGER", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE",
  "CONNECTION_DESIGNER_ENGINEER", "CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN",
];
const PROJECT_STATUS_CHANGED_ROLES: UserRole[] = [
  "ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER", "PROJECT_MANAGER_OFFICER",
  "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "CONNECTION_DESIGNER_ENGINEER",
  "CLIENT", "CLIENT_ADMIN", "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN",
];
const PROJECT_APPROVAL_FAB_DATE_ROLES: UserRole[] = [
  "ADMIN", "DEPT_MANAGER", "PROJECT_MANAGER", "PROJECT_MANAGER_OFFICER",
  "OPERATION_EXECUTIVE", "CONNECTION_DESIGNER_ENGINEER", "CLIENT", "CLIENT_ADMIN",
  "CLIENT_PROJECT_COORDINATOR", "VENDOR", "VENDOR_ADMIN",
];
const PROJECT_DELETED_ROLES: UserRole[] = ["ADMIN", "PROJECT_MANAGER_OFFICER", "DEPUTY_MANAGER"];

export class ProjectController {
    async handleCreateProject(req:AuthenticateRequest,res:Response){
        const uploadedFiles = mapUploadedFiles(
          (req.files as Express.Multer.File[]) || [],
          "project"
        );
        const project = await projectService.create({
          ...req.body,
          files: uploadedFiles
        }, req.user?.id || "");
        if (req.user?.id) {
          await sendNotification(req.user.id, buildCreatorNotification("PROJECT_CREATED", {
            title: "Project Created",
            message: `You created project '${project.name}'.`,
          }, { projectId: project.id, timestamp: new Date() }));
        }
        await notifyProjectStakeholdersByRole(project.id, PROJECT_CREATED_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "PROJECT_CREATED",
            basePayload: { projectId: project.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Received", message: `Project '${project.name}' was assigned and shared with you.` },
              oversight: { title: "Project Created", message: `Project '${project.name}' was created and is available for monitoring.` },
              internal: { title: "New Project Created", message: `Project '${project.name}' was created.` },
              default: { title: "Project Created", message: `Project '${project.name}' was created.` },
            },
          }),
          { excludeUserIds: req.user?.id ? [req.user.id] : [] }
        );
        res.status(201).json({
          status: 'success',
          data: project
        });
    }
    async handleUpdateProject(req:Request,res:Response){
      const { id } = req.params;
        const uploadedFiles = mapUploadedFiles(
          (req.files as Express.Multer.File[]) || [],
          "project"
        );
        const project = await projectService.update({
          ...req.body,
          files: uploadedFiles
        }, id);
        const updates = req.body ?? {};
        if ("stage" in updates) {
          await notifyProjectStakeholdersByRole(project.id, PROJECT_STAGE_CHANGED_ROLES, (role) =>
            buildRoleScopedNotification(role, {
            type: "PROJECT_STAGE_CHANGED",
            basePayload: { projectId: project.id, stage: updates.stage, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Stage Updated", message: `Project '${project.name}' stage changed to '${updates.stage}'.` },
              oversight: { title: "Project Stage Changed", message: `Project '${project.name}' stage changed to '${updates.stage}'.` },
              internal: { title: "Project Stage Changed", message: `Project '${project.name}' stage changed to '${updates.stage}'.` },
            },
          }), { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] });
        }
        if ("endDate" in updates) {
          await notifyProjectStakeholdersByRole(project.id, PROJECT_ENDDATE_CHANGED_ROLES, (role) =>
            buildRoleScopedNotification(role, {
            type: "PROJECT_END_DATE_CHANGED",
            basePayload: { projectId: project.id, endDate: updates.endDate, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project End Date Updated", message: `Project '${project.name}' end date was changed.` },
              oversight: { title: "Project End Date Changed", message: `Project '${project.name}' end date was changed.` },
              internal: { title: "Project End Date Changed", message: `Project '${project.name}' end date was changed.` },
            },
          }), { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] });
        }
        if ("status" in updates) {
          await notifyProjectStakeholdersByRole(project.id, PROJECT_STATUS_CHANGED_ROLES, (role) =>
            buildRoleScopedNotification(role, {
            type: "PROJECT_STATUS_CHANGED",
            basePayload: { projectId: project.id, status: updates.status, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Status Updated", message: `Project '${project.name}' status changed to '${updates.status}'.` },
              oversight: { title: "Project Status Changed", message: `Project '${project.name}' status changed to '${updates.status}'.` },
              internal: { title: "Project Status Changed", message: `Project '${project.name}' status changed to '${updates.status}'.` },
            },
          }), { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] });
        }
        if ("approvalDate" in updates) {
          await notifyProjectStakeholdersByRole(project.id, PROJECT_APPROVAL_FAB_DATE_ROLES, (role) =>
            buildRoleScopedNotification(role, {
            type: "PROJECT_APPROVAL_DATE_CHANGED",
            basePayload: { projectId: project.id, approvalDate: updates.approvalDate, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Approval Date Updated", message: `Project '${project.name}' approval date was updated.` },
              oversight: { title: "Project Approval Date Set / Changed", message: `Project '${project.name}' approval date was updated.` },
              internal: { title: "Project Approval Date Updated", message: `Project '${project.name}' approval date was updated.` },
            },
          }), { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] });
        }
        if ("fabricationDate" in updates) {
          await notifyProjectStakeholdersByRole(project.id, PROJECT_APPROVAL_FAB_DATE_ROLES, (role) =>
            buildRoleScopedNotification(role, {
            type: "PROJECT_FABRICATION_DATE_CHANGED",
            basePayload: { projectId: project.id, fabricationDate: updates.fabricationDate, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Fabrication Date Updated", message: `Project '${project.name}' fabrication date was updated.` },
              oversight: { title: "Fabrication Date Set / Changed", message: `Project '${project.name}' fabrication date was updated.` },
              internal: { title: "Project Fabrication Date Updated", message: `Project '${project.name}' fabrication date was updated.` },
            },
          }), { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] });
        }
        res.status(200).json({
          status: 'success',
          data: project
        });
    }
    async handleGetProject(req:Request,res:Response){
        const project = await projectService.get({id: req.params.id});
        if (!project) {
          return res.status(404).json({
            status: 'error',
            message: 'Project not found'
          });
        }
        res.status(200).json({
          status: 'success',
          data: project
        });
    }
    async handleDeleteProject(req:Request,res:Response){
        const project = await projectService.delete({id: req.params.id});
        if (!project) {
          return res.status(404).json({
            status: 'error',
            message: 'Project not found'
          });
        }
        await notifyProjectStakeholdersByRole(req.params.id, PROJECT_DELETED_ROLES, (role) =>
          buildRoleScopedNotification(role, {
            type: "PROJECT_DELETED",
            basePayload: { projectId: req.params.id, timestamp: new Date() },
            templates: {
              creator: { title: "", message: "" },
              external: { title: "Project Deleted", message: project?.name?.trim() ? `Project '${project.name}' was deleted.` : "A project was deleted." },
              oversight: { title: "Project Deleted / Soft Deleted", message: project?.name?.trim() ? `Project '${project.name}' was deleted.` : "A project was deleted." },
              internal: { title: "Project Deleted", message: project?.name?.trim() ? `Project '${project.name}' was deleted.` : "A project was deleted." },
            },
          }),
          { excludeUserIds: (req as AuthenticateRequest).user?.id ? [(req as AuthenticateRequest).user!.id] : [] }
        );
        res.status(204).json({
          status: 'success',
          data: null
        });
    }


async expandWbs(req: AuthenticateRequest, res: Response) {
  const { projectId } = req.params;
  const { bundleKeys } = req.body;


  if (!req.user?.id) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  }

  const result = await projectService.expandProjectWbs(
    projectId,
    bundleKeys,
    req.user.id
  );

  res.status(200).json({
    status: "success",
    data: result,
  });
}

    async handleGetAllProjects(req:AuthenticateRequest,res:Response){
      if(!req.user){
        return  res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
      } 
        const { id} = req.user;
        const projects = await projectService.getAll(id);
        res.status(200).json({
          status: 'success',
          data: projects
        });
    }
    async handleGetFile(req:Request,res:Response){
        const {projectId, fileId} = req.params;
        const file = await projectService.getFile(projectId, fileId);
        if (!file) {
          return res.status(404).json({
            status: 'error',
            message: 'File not found'
          });
        }
        res.status(200).json({
          status: 'success',
          data: file
        });
    }
    async handleViewFile(req:Request,res:Response){
        const {projectId, fileId} = req.params;
        await projectService.viewFile(projectId, fileId, res);
    }
    async handleGetProjectUpdateHistory(req:Request,res:Response){
       const { projectId } = req.params;
       const updateHistory = await projectService.getProjectUpdateHistoryByProjectId(projectId);
       res.status(200).json({
         status: 'success',
         data: updateHistory
       });
    }

    async handleGetAllDocuments(req:Request,res:Response){
      const { id } = req.params;
      const documents = await projectService.getAllDocuments(id);
      res.status(200).json({
        status: 'success',
        data: documents
      });
    }

    async handleCreateProjectAssist(req: AuthenticateRequest, res: Response) {
      if (!req.user) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const { projectId } = req.params;
      const { userId, isActive } = req.body as { userId: string; isActive?: boolean };

      const result = await projectAssistService.createAssist(
        projectId,
        userId,
        req.user.id,
        isActive ?? true
      );

      res.status(201).json({
        status: "success",
        message: "Project assist assigned",
        data: result,
      });
    }

    async handleGetProjectAssists(req: AuthenticateRequest, res: Response) {
      if (!req.user) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const { projectId } = req.params;
      const assists = await projectAssistService.listAssists(projectId, req.user.id);

      res.status(200).json({
        status: "success",
        data: assists,
      });
    }

    async handlePatchProjectAssist(req: AuthenticateRequest, res: Response) {
      if (!req.user) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const { projectId, userId } = req.params;
      const { isActive } = req.body as { isActive: boolean };

      const result = await projectAssistService.updateAssist(
        projectId,
        userId,
        req.user.id,
        isActive
      );

      res.status(200).json({
        status: "success",
        message: "Project assist updated",
        data: result,
      });
    }

    async handleDeleteProjectAssist(req: AuthenticateRequest, res: Response) {
      if (!req.user) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }

      const { projectId, userId } = req.params;
      await projectAssistService.deleteAssist(projectId, userId, req.user.id);

      res.status(200).json({
        status: "success",
        message: "Project assist removed",
      });
    }

}
