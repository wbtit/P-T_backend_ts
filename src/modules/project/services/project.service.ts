import { Stage } from "@prisma/client";
import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";
 import { ProjectRepository } from "../repositories";
 import { createWBSAndProjectLineItems } from "../WBS/utils/wbs.util";
 import { Prisma } from "@prisma/client";
 import { FileObject } from "../../../shared/fileType";

 const projectRepository = new ProjectRepository();

 export class ProjectService {
   
  
  async create(data: CreateProjectInput) {
     const existing = await projectRepository.getByProjectNumber(data.projectNumber);
     if (existing) {
       throw new AppError("Project with this number already exists", 409);
     }
     const project = await projectRepository.create(data);
     //lineItems creation
     console.log("ProjectLine Items created for the project:",project.name);
     await createWBSAndProjectLineItems(project.id,project.stage);
     return project;
   }



   async update(data: UpdateprojectInput) {
        const existing = await projectRepository.get(data);
        //1** Check if the stage has changed and update the history accordingly
        if(existing?.stage!==data.stage){
         await prisma.projectStageHistory.updateMany({
          where:{projectID:data.id,endDate:null},
          data:{endDate:new Date()}
         });
         await prisma.projectStageHistory.create({
           data:{
             projectID:data.id,
             stage:data.stage as Stage,
             startDate:new Date()
           }
         });
         //1.1** Create WBS and Project Line Items
         await createWBSAndProjectLineItems(data.id,data.stage as Stage);
        }
        //2.1** Check if the end date has changed to track the  automated mail
        if(existing?.endDate !== data.endDate){
          data.submissionMailReminder=false;
          //3** Check if the end date change log exists and update it
          const existingLog = data.endDateChangeLog as Prisma.JsonValue;
          const newLogEntry={
            oldEndDate:existing?.endDate,
            newEndDate:data.endDate,
            changedAt:new Date()
          }
          const updatedLog = Array.isArray(existingLog) ? [...existingLog, JSON.stringify(newLogEntry)] : [JSON.stringify(newLogEntry)];
          data.endDateChangeLog = updatedLog as string[];
        }

        //2.2** Check if the approval date has changed to track the  automated mail
        if(existing?.approvalDate !==data.approvalDate){
          data.mailReminder=false;
        }
      //update project
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

   async getFile(projectId: string, fileId: string) {
   const project = await projectRepository.get({ id: projectId });
   if (!project) {
     throw new AppError("Project not found", 404);
   }
   const files = project.files as unknown as FileObject[];
   const file = files.find((file:FileObject) => file.id === fileId);
   if (!file) {
     throw new AppError("File not found", 404);
   }
   return file;
 }
}