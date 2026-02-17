import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { AppError } from "../../../config/utils/AppError";
import { FileObject } from "../../../shared/fileType";
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


async getAllDocuments(id:string){
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        files: true,
        rfq: {
          select: {
            id: true,
            subject: true,
            description: true,
            status: true,
            wbtStatus: true,
            createdAt: true,
            files: true,
            responses: {
              select: {
                id: true,
                description: true,
                status: true,
                wbtStatus: true,
                createdAt: true,
                files: true,
              },
            },
          },
        },
        rfi: {
          select: {
            id: true,
            subject: true,
            description: true,
            date: true,
            status: true,
            files: true,
            rfiresponse: {
              select: {
                id: true,
                reason: true,
                createdAt: true,
                responseState: true,
                wbtStatus: true,
                files: true,
              },
            },
          },
        },
        submittals: {
          select: {
            id: true,
            subject: true,
            date: true,
            stage: true,
            status: true,
            currentVersionId: true,
            currentVersion: {
              select: {
                id: true,
                versionNumber: true,
                description: true,
                createdAt: true,
                files: true,
              },
            },
            versions: {
              select: {
                id: true,
                versionNumber: true,
                description: true,
                createdAt: true,
                files: true,
              },
            },
            submittalsResponse: {
              select: {
                id: true,
                submittalVersionId: true,
                description: true,
                reason: true,
                status: true,
                wbtStatus: true,
                createdAt: true,
                files: true,
              },
            },
          },
        },
        changeOrders: {
          select: {
            id: true,
            changeOrderNumber: true,
            description: true,
            remarks: true,
            sentOn: true,
            stage: true,
            status: true,
            files: true,
            coResponses: {
              select: {
                id: true,
                Status: true,
                description: true,
                createdAt: true,
                files: true,
              },
            },
          },
        },
        designDrawings: {
          select: {
            id: true,
            stage: true,
            description: true,
            uploadedAt: true,
            files: true,
            responses: {
              select: {
                id: true,
                description: true,
                reason: true,
                status: true,
                wbtStatus: true,
                respondedAt: true,
                createdAt: true,
                files: true,
              },
            },
          },
        },
        notes: {
          select: {
            id: true,
            content: true,
            stage: true,
            createdAt: true,
            updatedAt: true,
            files: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const normalizeFiles = (value: unknown): FileObject[] => {
      if (!Array.isArray(value)) return [];
      return value as FileObject[];
    };

    return {
      project: {
        id: project.id,
        files: normalizeFiles(project.files),
      },
      rfq: project.rfq
        ? [
          {
            id: project.rfq.id,
            subject: project.rfq.subject,
            description: project.rfq.description,
            status: project.rfq.status,
            wbtStatus: project.rfq.wbtStatus,
            createdAt: project.rfq.createdAt,
            files: normalizeFiles(project.rfq.files),
            responses: project.rfq.responses.map((response) => ({
              id: response.id,
              description: response.description,
              status: response.status,
              wbtStatus: response.wbtStatus,
              createdAt: response.createdAt,
              files: normalizeFiles(response.files),
            })),
          },
        ]
        : [],
      rfi: project.rfi.map((rfi) => ({
        id: rfi.id,
        subject: rfi.subject,
        description: rfi.description,
        date: rfi.date,
        status: rfi.status,
        files: normalizeFiles(rfi.files),
        responses: rfi.rfiresponse.map((response) => ({
          id: response.id,
          reason: response.reason,
          createdAt: response.createdAt,
          responseState: response.responseState,
          wbtStatus: response.wbtStatus,
          files: normalizeFiles(response.files),
        })),
      })),
      submittals: project.submittals.map((submittal) => ({
        id: submittal.id,
        subject: submittal.subject,
        date: submittal.date,
        stage: submittal.stage,
        status: submittal.status,
        currentVersionId: submittal.currentVersionId,
        currentVersion: submittal.currentVersion
          ? {
              id: submittal.currentVersion.id,
              versionNumber: submittal.currentVersion.versionNumber,
              description: submittal.currentVersion.description,
              createdAt: submittal.currentVersion.createdAt,
              files: normalizeFiles(submittal.currentVersion.files),
            }
          : null,
        versions: submittal.versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          description: version.description,
          createdAt: version.createdAt,
          files: normalizeFiles(version.files),
        })),
        responses: submittal.submittalsResponse.map((response) => ({
          id: response.id,
          submittalVersionId: response.submittalVersionId,
          description: response.description,
          reason: response.reason,
          status: response.status,
          wbtStatus: response.wbtStatus,
          createdAt: response.createdAt,
          files: normalizeFiles(response.files),
        })),
      })),
      changeOrders: project.changeOrders.map((changeOrder) => ({
        id: changeOrder.id,
        changeOrderNumber: changeOrder.changeOrderNumber,
        description: changeOrder.description,
        remarks: changeOrder.remarks,
        sentOn: changeOrder.sentOn,
        stage: changeOrder.stage,
        status: changeOrder.status,
        files: normalizeFiles(changeOrder.files),
        responses: changeOrder.coResponses.map((response) => ({
          id: response.id,
          status: response.Status,
          description: response.description,
          createdAt: response.createdAt,
          files: normalizeFiles(response.files),
        })),
      })),
      designDrawings: project.designDrawings.map((designDrawing) => ({
        id: designDrawing.id,
        stage: designDrawing.stage,
        description: designDrawing.description,
        uploadedAt: designDrawing.uploadedAt,
        files: normalizeFiles(designDrawing.files),
        responses: designDrawing.responses.map((response) => ({
          id: response.id,
          description: response.description,
          reason: response.reason,
          status: response.status,
          wbtStatus: response.wbtStatus,
          respondedAt: response.respondedAt,
          createdAt: response.createdAt,
          files: normalizeFiles(response.files),
        })),
      })),
      notes: project.notes.map((note) => ({
        id: note.id,
        content: note.content,
        stage: note.stage,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        files: normalizeFiles(note.files),
      })),
    };
  }
}
