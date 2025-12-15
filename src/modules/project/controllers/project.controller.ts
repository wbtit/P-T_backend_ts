import { Response,Request } from "express";
import { ProjectService } from "../services";
import { mapUploadedFiles } from "../../uploads/fileUtil";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";

const projectService = new ProjectService();

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
        res.status(204).json({
          status: 'success',
          data: null
        });
    }
    async expandWbs(req: AuthenticateRequest, res: Response) {
  const { projectId } = req.params;
  const { wbsTemplateIds } = req.body;

  const result = await projectService.expandProjectWbs(
    projectId,
    wbsTemplateIds,
    req.user?.id
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
}