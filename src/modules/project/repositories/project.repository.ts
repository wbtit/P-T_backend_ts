import prisma from "../../../config/database/client";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";
import { createProjectWbsForStage } from "../utils/createProjectWbsForStorage";
import { setProjectWbsSelection } from "../utils/setProjectWbsSelection";

 export class ProjectRepository {
   async create(data: CreateProjectInput & {wbsTemplateIds:string[]},userId:string) {
    return prisma.$transaction(async tx=>{
      const project = await tx.project.create({
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

     await setProjectWbsSelection(project.id,data.wbsTemplateIds,userId);
     await createProjectWbsForStage(project.id,project.stage);
     return project;
    });
   }

   async update(id:string,data: UpdateprojectInput) {
     const project = await prisma.project.update({
       where: { id: id },
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
      return await prisma.project.findMany({
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
   async getForProjectManager(projectManagerId: string) {
      return await prisma.project.findMany({
       where: { managerID:projectManagerId },
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
   }

   async getForDepartmentManager(departmentId: string) {
      return await prisma.project.findMany({
       where: { departmentID:departmentId },
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
   }

   async getForConnectionDesignerEngineer(userId: string) {
      return await prisma.project.findMany({
        where:{connectionDesignerID:userId},
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
      })
   }

   async getProjectsForClientAdmin(clientAdminId: string) {
    return await prisma.project.findMany({
      where:{fabricatorID:clientAdminId},
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
    })
   }

   async getProjectsForClient(clientId: string){
    return await prisma.project.findMany({
      where:{fabricator:{pointOfContact: { some: { id: clientId } }}},
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
    })
   }
}