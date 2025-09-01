import { AppError } from "../../../config/utils/AppError";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";
 import { ProjectRepository } from "../repositories";

 const projectRepository = new ProjectRepository();

 export class ProjectService {
   async create(data: CreateProjectInput) {
     const existing = await projectRepository.getByProjectNumber(data.projectNumber);
     if (existing) {
       throw new AppError("Project with this number already exists", 409);
     }
     const project = await projectRepository.create(data);
     return project;
   }

   async update(data: UpdateprojectInput) {
    if(data.projectNumber){
        const existing = await projectRepository.getByProjectNumber(data.projectNumber);
     if (existing) {
       throw new AppError("Project with this number already exists", 409);
     }
    }
     const project = await projectRepository.update(data);
     return project;
   }

   async get(data: GetProjectInput) {
     const project = await projectRepository.get(data);
     return project;
   }

   async delete(data: DeleteProjectInput) {
    const existing = await projectRepository.get({ id: data.id });
     if (!existing) {
       throw new AppError("Project not found", 404);
     }
     const project = await projectRepository.delete(data);
     return project;
   }

   async getAll() {
     const projects = await projectRepository.getAll();
     return projects;
   }
 }