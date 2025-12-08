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
import { streamFile } from "../../../utils/fileUtil";
import path from "path";
import { Response } from "express";
import { UserJwt } from "../../../shared/types";

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

   async getAll(id:string) {
    const user = await prisma.user.findUnique({where:{id}});
    if(!user){
      throw new AppError("User not found", 404);
    }
     let projects;
     if(user.role==="ADMIN"|| user.role==="SYSTEM_ADMIN"|| user.role==="PROJECT_MANAGER_OFFICER"
      || user.role==="DEPUTY_MANAGER"|| user.role==="OPERATION_EXECUTIVE"){
        //all projects
        projects = await projectRepository.getAll();
     }
     if(user.role==="PROJECT_MANAGER"|| user.role ==="TEAM_LEAD"){
      //only his project 
      projects = await projectRepository.getForProjectManager(user.id);
     }  
     if(user.role==="DEPT_MANAGER"){
      //only of his department
      projects = await projectRepository.getForDepartmentManager(user.departmentId!);
     }
     if(user.role==="CONNECTION_DESIGNER_ENGINEER"){
      //only his assigned projects
      projects = await projectRepository.getForConnectionDesignerEngineer(user.id);
     }
     if(user.role==="CLIENT_ADMIN"){
      //acts as fab represnentative
      projects = await projectRepository.getProjectsForClientAdmin(user.id);
     }
     if(user.role==="CLIENT"){
      //acts as point of contact
      projects = await projectRepository.getProjectsForClient(user.id);
     }

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

   async viewFile(projectId: string, fileId: string,res:Response) {
   const project = await projectRepository.get({ id: projectId });
   if (!project) {
     throw new AppError("Project not found", 404);
   }
   const files = project.files as unknown as FileObject[];
   const file = files.find((file:FileObject) => file.id === fileId);
   if (!file) {
     throw new AppError("File not found", 404);
   }
    const __dirname=path.resolve();
    const filePath = path.join(__dirname, file.filename);
    return streamFile(res, filePath, file.originalName);
   
 }
 async getProjectUpdateHistoryByProjectId(projectId: string) {
   const updateHistory = await projectRepository.getProjectUpdateHistoryByProjectId(projectId);
   return updateHistory;
 }
}