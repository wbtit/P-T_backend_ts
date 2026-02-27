import { Response,Request } from "express";
import { ProjectService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const projectService = new ProjectService();
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
        await notifyByRoles(PROJECT_CREATED_ROLES, {
          type: "PROJECT_CREATED",
          title: "Project Created",
          message: `Project '${project.name}' was created.`,
          projectId: project.id,
          timestamp: new Date(),
        });
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
          await notifyByRoles(PROJECT_STAGE_CHANGED_ROLES, {
            type: "PROJECT_STAGE_CHANGED",
            title: "Project Stage Changed",
            message: `Project '${project.name}' stage changed to '${updates.stage}'.`,
            projectId: project.id,
            stage: updates.stage,
            timestamp: new Date(),
          });
        }
        if ("endDate" in updates) {
          await notifyByRoles(PROJECT_ENDDATE_CHANGED_ROLES, {
            type: "PROJECT_END_DATE_CHANGED",
            title: "Project End Date Changed",
            message: `Project '${project.name}' end date was changed.`,
            projectId: project.id,
            endDate: updates.endDate,
            timestamp: new Date(),
          });
        }
        if ("status" in updates) {
          await notifyByRoles(PROJECT_STATUS_CHANGED_ROLES, {
            type: "PROJECT_STATUS_CHANGED",
            title: "Project Status Changed",
            message: `Project '${project.name}' status changed to '${updates.status}'.`,
            projectId: project.id,
            status: updates.status,
            timestamp: new Date(),
          });
        }
        if ("approvalDate" in updates) {
          await notifyByRoles(PROJECT_APPROVAL_FAB_DATE_ROLES, {
            type: "PROJECT_APPROVAL_DATE_CHANGED",
            title: "Project Approval Date Set / Changed",
            message: `Project '${project.name}' approval date was updated.`,
            projectId: project.id,
            approvalDate: updates.approvalDate,
            timestamp: new Date(),
          });
        }
        if ("fabricationDate" in updates) {
          await notifyByRoles(PROJECT_APPROVAL_FAB_DATE_ROLES, {
            type: "PROJECT_FABRICATION_DATE_CHANGED",
            title: "Fabrication Date Set / Changed",
            message: `Project '${project.name}' fabrication date was updated.`,
            projectId: project.id,
            fabricationDate: updates.fabricationDate,
            timestamp: new Date(),
          });
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
        await notifyByRoles(PROJECT_DELETED_ROLES, {
          type: "PROJECT_DELETED",
          title: "Project Deleted / Soft Deleted",
          message: `Project '${req.params.id}' was deleted.`,
          projectId: req.params.id,
          timestamp: new Date(),
        });
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

}
