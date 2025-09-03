import prisma from "../../../config/database/client";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";

 export class ProjectRepository {
   async create(data: CreateProjectInput) {
     const project = await prisma.project.create({
       data,
       include:{
        stageHistory:true,
        fabricator:true,
        manager:true,
        team:true,
        tasks:true,
        projectJobStudy:true,
        projectWorkBreakdown:true,
        lineItems:true,
        notes:true,
        rfq:true
       }
     });
     return project;
   }

   async update(data: UpdateprojectInput) {
     const project = await prisma.project.update({
       where: { id: data.id },
       data,
       include:{
        stageHistory:true,
        fabricator:true,
        manager:true,
        team:true,
        tasks:true,
        projectJobStudy:true,
        projectWorkBreakdown:true,
        lineItems:true,
        notes:true,
        rfq:true
       }
     });
     return project;
   }

   async get(data: GetProjectInput) {
     const project = await prisma.project.findUnique({
       where: { id: data.id },
       include:{
        stageHistory:true,
        fabricator:true,
        manager:true,
        team:{
          select:{
            members:true,
          }
        },
        tasks:true,
        projectJobStudy:true,
        projectWorkBreakdown:true,
        lineItems:true,
        notes:true,
        rfq:true
       }
     });
     return project;
   }

   async getByProjectNumber(projectNumber: string) {
     const project = await prisma.project.findUnique({
       where: { projectNumber }
     });
     return project;
   }

   async delete(data: DeleteProjectInput) {
     const project = await prisma.project.update({
       where: { id: data.id },
       data: { isDeleted: true },
     });
     return project;
   }
   async getAll() {
     const projects = await prisma.project.findMany({
       include:{
        stageHistory:true,
        fabricator:true,
        manager:true,
        team:true,
        tasks:true,
        projectJobStudy:true,
        projectWorkBreakdown:true,
        lineItems:true,
        notes:true,
        rfq:true
       }
     });
     return projects;
   }
}