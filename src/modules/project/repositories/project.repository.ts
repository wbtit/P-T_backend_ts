import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { CreateProjectInput,
  UpdateprojectInput,
  GetProjectInput,
  DeleteProjectInput
 } from "../dtos";
import { createProjectWbsForStage } from "../utils/createProjectWbsForStorage";
import { setProjectWbsSelection } from "../utils/setProjectWbsSelection";
import { generateProjectSerial } from "../../../utils/serial.util";

 export class ProjectRepository {
   async create(data: CreateProjectInput, userId: string) {
  return prisma.$transaction(async tx => {
    const { wbsTemplateIds = [], ...projectPayload } = data as CreateProjectInput & {
      wbsTemplateIds?: string[];
    };
    const { serialNo, projectCode } = await generateProjectSerial(tx);

    const project = await tx.project.create({
      data: {
        ...projectPayload,
        serialNo,
        projectCode,
      },
      include: {
        stageHistory: true,
        fabricator: { select: { files: true, fabName: true, id: true } },
        manager: { select: { firstName: true, middleName: true, lastName: true, username: true, id: true } },
        team: true,
        department: { select: { name: true, id: true } },
      },
    });
    const validTemplates = await tx.wbsTemplate.findMany({
    where: {
      id: { in: wbsTemplateIds },
      isActive: true,
      isDeleted: false,
    },
      select: { id: true },
  });

// if (validTemplates.length !== data.wbsTemplateIds?.length) {
//   throw new AppError("Invalid WBS template selection", 400);
// }

    await setProjectWbsSelection(
      tx,
      project.id,
      wbsTemplateIds,
      userId
    );

    await createProjectWbsForStage(
      tx,
      project.id,
      project.stage
    );

    return project;
  });
}

  async updateWithTx(
  tx: Prisma.TransactionClient,
  id: string,
  data: UpdateprojectInput
) {
  return tx.project.update({
    where: { id },
    data,
    include: {
      stageHistory: true,
      fabricator: {
        select: { files: true, fabName: true, id: true },
      },
      manager: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          username: true,
          id: true,
        },
      },
      team: true,
      department: {
        select: { name: true, id: true },
      },
    },
  });
}


   async get(data: GetProjectInput) {
     const project = await prisma.project.findUnique({
       where: { id: data.id },
       include:{
        clentCommunications:true,
        projectBundles:{
          include:{
            bundle:{
              include:{
                wbsTemplates:true
              }
            }
          }
        },
        
        projectbias:true,
        rfi:{include:{recepients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      sender:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        submittals:{include:{recepients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      sender:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        changeOrders:{include:{Recipients:{select:{firstName:true,middleName:true,lastName:true,id:true}},
                      senders:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        designDrawings:{include:{user:{select:{firstName:true,middleName:true,lastName:true,id:true}}}},
        mileStones:true,
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
     if(!project || project.isDeleted){
      return null;
     }
     const IFACOmpletionNUmber = project.mileStones.filter(m => m.stage === 'IFA').length === 0 ? 0 :
     (project.submittals.filter(m => m.stage === 'IFA' ).length / project.mileStones.filter(m => m.stage === 'IFA').length) * 100;

     const IFCCompletionNumber = project.mileStones.filter(m => m.stage === 'IFC').length === 0 ? 0 :
     (project.submittals.filter(m => m.stage === 'IFC').length / project.mileStones.filter(m => m.stage === 'IFC').length) * 100;

     await prisma.project.update({
      where:{id:project.id},
      data:{
        IFAComepletionPercentage: IFACOmpletionNUmber,
        IFCompletionPercentage: IFCCompletionNumber
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
      where:{fabricator:{pointOfContact: { some: { id: clientAdminId } }}},
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
      where:{
        rfq:{sender:{id:clientId}}
      },
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

async getForStaff(staffId: string) {
  return await prisma.project.findMany({
    where:{
      tasks:{some:{user_id:staffId}}
    },
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
