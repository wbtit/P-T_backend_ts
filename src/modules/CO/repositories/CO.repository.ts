import prisma from "../../../config/database/client";
import { CotableRowInput, CreateCoInput, CreateCOTableInput, UpdateCoInput } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class CORepository {
    async create(data:CreateCoInput,coNum:string,userId:string,approval:boolean){
        return await prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: data.project },
            select: { projectCode: true, projectNumber: true },
          });
          if (!project) {
            throw new AppError("Project not found for change order serial generation", 404);
          }

          const serialNo = await generateProjectScopedSerial(tx, {
            prefix: SERIAL_PREFIX.CHANGE_ORDER,
            projectScopeId: data.project,
            projectToken: project.projectCode ?? project.projectNumber,
          });

          return tx.changeOrder.create({
            data: {
              serialNo,
              changeOrderNumber: serialNo,
              description:data.description,
              project:data.project,
              status: "NOT_REPLIED",
              stage: data.stage || "IFA",
              recipients:data.recipients,
              remarks:data.remarks,
              reason:data.reason,
              files:data.files,
              sentOn:data.sentOn|| new Date(),
              isAproovedByAdmin:approval,
              sender: userId,
            },
          });
        });
    }
    async update(id:string,data:UpdateCoInput){
        return await prisma.changeOrder.update({
      where: { id },
      data: {
        project: data.project,
        recipients: data.recipients,
        remarks: data.remarks,
        changeOrderNumber: data.changeOrderNumber,
        description: data.description,
        sender: data.sender,
        stage: data.stage,
        status: data.status,
        reason: data.reason,
        isAproovedByAdmin: data.isAproovedByAdmin
      }
    });
    }

    async findPendingCOsForClientAdmin(userId:string){
      const fabricator = await prisma.fabricator.findFirst({
            where: {
                pointOfContact: {
                    some: {
                        id: userId,
                        role: "CLIENT_ADMIN"
                    }
                }
            }
        })
        return await prisma.changeOrder.findMany({
          where:{
                Recipients:{FabricatorPointOfContacts:{
                        some:{
                            id:fabricator?.id,
                        }
                    }},
                    coResponses:{none:{}}
                },
                include:{
            coResponses:{include:{childResponses:true}},
            Project:true,
            Recipients:true,
            senders:true,
            CoRefersTo:true,
          }
        })
    }

    async recivedCos(userId:string){
        return await prisma.changeOrder.findMany({
            where:{
                recipients:userId,
                isAproovedByAdmin:true
            },
              select:{
                id:true,
                remarks:true,
                description:true,
                changeOrderNumber:true,
                sentOn:true,
                files:true,
                project:true,
                recipients:true
                
            }
        })
    }
    async sentCos(userId:string){
        return await prisma.changeOrder.findMany({
            where:{
                sender:userId
            },
            select:{
                id:true,
                remarks:true,
                description:true,
                changeOrderNumber:true,
                sentOn:true,
                files:true,
                recipients:true,
                project:true
                
                
            }
        })
    }
    async getByProjectId(projectId:string){
        return await prisma.changeOrder.findMany({
      where:{project:projectId},
      include:{
        Project:true,
        Recipients:true,
        senders:true,
        coResponses:true,
        CoRefersTo:true,
      }
    })
    }
    async findById(id:string){
        return await prisma.changeOrder.findUnique({
            where:{id:id}
          ,include:{
            coResponses:{include:{childResponses:true}},
            Project:true,
            Recipients:true,
            senders:true,
            CoRefersTo:true,
          }
        })
    }


    //CO TABLE



    async createCoTable(data: CreateCOTableInput, coId: string, userId: string) {
  // data will be an array of items validated by Zod
  const dataToInsert = data.map((co) => ({
    description: co.description,
    referenceDoc: co.referenceDoc,
    elements: co.elements,
    QtyNo: co.QtyNo,
    remarks: co.remarks ?? "",
    hours: co.hours,
    cost: co.cost,
    costUpdatedBy: userId,
    costUpdatedAt: new Date(),
    CoId: coId,
  }));

  return await prisma.changeOrdertable.createMany({
    data: dataToInsert,
    skipDuplicates: true,
  });
}

async updateCoTableRow(data:CotableRowInput,id:string,userId:string){
    return await prisma.changeOrdertable.update({
      where: { id },
      data: {
        description: data.description,
        referenceDoc: data.referenceDoc,
        elements: data.elements,
        QtyNo: data.QtyNo,
        remarks: data.remarks,
        hours: data.hours,
        cost: data.cost,
        CoId: data.CoId,
        ...(data.cost !== undefined && {
          costUpdatedBy: userId,
          costUpdatedAt: new Date()
        })
      }
    });
}
async getCoTableByCoId(CoId:string,userId:string){
    const curruser= await prisma.user.findUnique({
      where:{id:userId},
      select:{id:true,role:true}
    })
    let coRow = await prisma.changeOrdertable.findMany({
      where: { CoId }
    });
    if(curruser?.role==="ADMIN"||curruser?.role==="PROJECT_MANAGER"){
        coRow=coRow.map(row=>{
            if(row.costUpdatedBy!==curruser?.id){
                return { ...row, cost: null } as any;
            }
            return row;
        })
    }
    return coRow;

}

async pendingCOs(){
    return await prisma.changeOrder.findMany({
       where: {
          NOT:{
            coResponses: {
            some: {
              childResponses: {
                some: { Status: "ACCEPT" },
              },
            },
          }, 
          }
        },
    })
}

async findPendingCOsForProjectManager(managerId: string) {
    return await prisma.changeOrder.findMany({
        where: {
            Project: { managerID: managerId },
            
                coResponses: {
                    some: {
                        childResponses: {
                            none:{},
                        },
                    },
                },
            
        },
        include: {
            coResponses: { include: { childResponses: true } },
            Project: true,
            Recipients: true,
            senders: true,
            CoRefersTo: true,
        },
    });
}

async findNewCOsForProjectManager(managerId: string) {
    return await prisma.changeOrder.findMany({
        where: {
            Project: { managerID: managerId },
            coResponses: { none: {} },
        },
        include: {
            coResponses: { include: { childResponses: true } },
            Project: true,
            Recipients: true,
            senders: true,
            CoRefersTo: true,
        },
    });
}
}
