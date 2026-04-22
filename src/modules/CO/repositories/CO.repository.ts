import prisma from "../../../config/database/client";
import { CotableRowInput, CreateCoInput, CreateCOTableInput, UpdateCoInput } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class CORepository {
    async create(data:CreateCoInput,userId:string,approval:boolean){
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
              changeOrderNumber: data.changeOrderNumber ?? "",
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
              multipleRecipients: data.multipleRecipients?.length
                ? { connect: data.multipleRecipients.map((id: string) => ({ id })) }
                : undefined,
            },
            include: {
              Recipients: true,
              multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
              Project: true,
              senders: true,
            }
          });
        });
    }
    async update(id:string,data:UpdateCoInput){
        const { multipleRecipients, ...rest } = data;
        return await prisma.changeOrder.update({
      where: { id },
      data: {
        project: rest.project,
        recipients: rest.recipients,
        remarks: rest.remarks,
        changeOrderNumber: rest.changeOrderNumber,
        description: rest.description,
        sender: rest.sender,
        stage: rest.stage,
        status: rest.status,
        reason: rest.reason,
        isAproovedByAdmin: rest.isAproovedByAdmin,
        multipleRecipients: multipleRecipients?.length
          ? { set: [], connect: multipleRecipients.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        Recipients: true,
        multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
        Project: true,
        senders: true,
      }
    });
    }

    async findClientSidePendingCOs() {
        return await prisma.changeOrder.findMany({
          where:{
                Project: { status: { in: ["ACTIVE", "ONHOLD"] } },
                coResponses:{none:{}},
                isAproovedByAdmin: true
            },
            include:{
              coResponses:{include:{childResponses:true}},
              Project:true,
              Recipients:true,
              multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
              senders:true,
              CoRefersTo:true,
          }
        })
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
                Project: { status: { in: ["ACTIVE", "ONHOLD"] } },
                Recipients:{FabricatorPointOfContacts:{
                        some:{
                            id:fabricator?.id,
                        }
                    }},
                    coResponses:{none:{}},
                    isAproovedByAdmin: true
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

    async findPendingCOsForClient(userId:string){
      return await prisma.changeOrder.findMany({
         where:{
                    Project: {
                        clientProjectManagers: { some: { id: userId } },
                        status: { not: "INACTIVE" }
                    },
                    coResponses:{none:{}},
                    isAproovedByAdmin: true
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
        
    async recivedCos(userId:string, projectId?: string){
        return await prisma.changeOrder.findMany({
            where:{
                ...(projectId ? { project: projectId } : {}),
                OR: [
                    { recipients: userId },
                    { multipleRecipients: { some: { id: userId } } }
                ],
                isAproovedByAdmin:true
            },
            include:{
                Recipients:true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                senders:true,
                Project:true,
            }
        })
    }
    async sentCos(userId:string, projectId?: string){
        return await prisma.changeOrder.findMany({
            where:{
                sender:userId,
                ...(projectId ? { project: projectId } : {}),
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
            versions: {
              include: {
                createdBy: { select: { firstName: true, lastName: true, id: true } },
                changeOrderTables: true,
              },
              orderBy: { versionNumber: "desc" },
            },
            currentVersion: {
               include: {
                 changeOrderTables: true
               }
            },
            coResponses:{include:{childResponses:true}},
            Project:true,
            Recipients:true,
            multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
            senders:true,
            CoRefersTo:true,
          }
        })
    }


    //CO TABLE



    async createCoTable(data: CreateCOTableInput, coId: string, userId: string, changeOrderVersionId?: string) {
  let targetVersionId = changeOrderVersionId;

  if (!targetVersionId) {
    const co = await prisma.changeOrder.findUnique({
      where: { id: coId },
      select: { currentVersionId: true }
    });
    targetVersionId = co?.currentVersionId || undefined;
  }

  // data will be an array of items validated by Zod
  const dataToInsert = data.map((item) => ({
    description: item.description,
    referenceDoc: item.referenceDoc,
    elements: item.elements,
    QtyNo: item.QtyNo,
    remarks: item.remarks ?? "",
    hours: item.hours,
    cost: item.cost,
    costUpdatedBy: userId,
    costUpdatedAt: new Date(),
    CoId: coId,
    changeOrderVersionId: targetVersionId || item.changeOrderVersionId,
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
async replaceCoTableByCoId(data: CreateCOTableInput, coId: string, userId: string, changeOrderVersionId?: string) {
    let targetVersionId = changeOrderVersionId;
    if (!targetVersionId) {
        const co = await prisma.changeOrder.findUnique({
            where: { id: coId },
            select: { currentVersionId: true }
        });
        targetVersionId = co?.currentVersionId || undefined;
    }

    if (targetVersionId) {
      await prisma.changeOrdertable.deleteMany({
        where: { changeOrderVersionId: targetVersionId }
      });
    } else {
      await prisma.changeOrdertable.deleteMany({
        where: { CoId: coId }
      });
    }

    if (!data.length) {
      return [];
    }

    await prisma.changeOrdertable.createMany({
      data: data.map((item) => ({
        description: item.description,
        referenceDoc: item.referenceDoc,
        elements: item.elements,
        QtyNo: item.QtyNo,
        remarks: item.remarks ?? "",
        hours: item.hours,
        cost: item.cost,
        costUpdatedBy: userId,
        costUpdatedAt: new Date(),
        CoId: coId,
        changeOrderVersionId: targetVersionId || item.changeOrderVersionId,
      })),
    });

    return await prisma.changeOrdertable.findMany({
      where: targetVersionId ? { changeOrderVersionId: targetVersionId } : { CoId: coId }
    });
}
async getCoTableByCoId(CoId:string,userId:string, changeOrderVersionId?: string){
    const curruser= await prisma.user.findUnique({
      where:{id:userId},
      select:{id:true,role:true}
    })

    let targetVersionId = changeOrderVersionId;
    if (!targetVersionId) {
        const co = await prisma.changeOrder.findUnique({
            where: { id: CoId },
            select: { currentVersionId: true }
        });
        targetVersionId = co?.currentVersionId || undefined;
    }

    let coRow = await prisma.changeOrdertable.findMany({
      where: targetVersionId ? { changeOrderVersionId: targetVersionId } : { CoId }
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

async findPendingCOsForDepartmentManager(managerId: string) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { departmentId: true },
    });
    if (!manager?.departmentId) return [];

    return await prisma.changeOrder.findMany({
      where: {
        Project: { departmentID: manager.departmentId },
        NOT: {
          coResponses: {
            some: {
              childResponses: {
                some: { Status: "ACCEPT" },
              },
            },
          },
        },
      },
    });
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
