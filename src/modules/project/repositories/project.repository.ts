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
        fabricator:{select:{
          files:true,
          fabName:true,
          id:true
        }},
        manager:{select:{
          firstName:true,
          middleName:true,
          lastName:true,
          username:true,
          id:true
        }},
        team:true,
        department:{select:{
          name:true,
          id:true
        }}
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
        fabricator:{select:{
          files:true,
          fabName:true,
          id:true
        }},
        manager:{select:{
          firstName:true,
          middleName:true,
          lastName:true,
          username:true,
          id:true
        }},
        team:true,
        department:{select:{
          name:true,
          id:true
        }}
       }
     });
     return project;
   }

   async get(data: GetProjectInput) {
     const project = await prisma.project.findUnique({
       where: { id: data.id },
       include:{
        rfi:{include:{recepients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      sender:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        submittals:{include:{recepients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      sender:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        changeOrders:{include:{Recipients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      senders:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        designDrawings:{include:{user:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        stageHistory:true,
        fabricator:{select:{
          files:true,
          fabName:true,
          id:true
        }},
        manager:{select:{
          firstName:true,
          middleName:true,
          lastName:true,
          username:true,
          id:true
        }},
        team:true,
        department:{select:{
          name:true,
          id:true
        }}
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
        fabricator:{select:{
          files:true,
          fabName:true,
          id:true
        }},
        manager:{select:{
          firstName:true,
          middleName:true,
          lastName:true,
          username:true,
          id:true
        }},
        team:true,
        department:{select:{
          name:true,
          id:true
        }}
       }
     });
     return projects;
   }
   async getProjectUpdateHistoryByProjectId(projectId: string) {
     const updateLog = await prisma.projectStageHistory.findMany({
       where: { projectID:projectId },
       include:{
        project:true
       }
     });
     return updateLog;
   }
}