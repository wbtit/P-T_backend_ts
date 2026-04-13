import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

type CreateRfqPersistInput = Omit<CreateRfqInput, "recipientId"> & {
  recipientId: string;
  serialNo: string;
};

const RFQ_RESPONSES_INCLUDE = {
  where: {
    parentResponseId: null,
  },
  include: {
    user: true,
    childResponses: {
      include: {
        user: true,
      },
    },
  },
} as const;

export class RFQRepository {
    async create(data: CreateRfqPersistInput) {
      return this.createWithTx(prisma, data);
    }

    async createWithTx(
      tx: Prisma.TransactionClient | typeof prisma,
      data: CreateRfqPersistInput
    ) {
      const cleanedData = cleandata(data);
      const { multipleRecipients, ...restData } = cleanedData;

      return await tx.rFQ.create({
        data: {
          ...restData,
          multipleRecipients: multipleRecipients?.length
            ? { connect: multipleRecipients.map((id: string) => ({ id })) }
            : undefined,
        },
        include: {
          sender: true,
          recipient: true,
          multipleRecipients: { select: { id: true, firstName: true, lastName: true, username: true, designation: true, email: true } },
          project: { select: { name: true } },
          salesPerson: true,
          responses: RFQ_RESPONSES_INCLUDE
        }
      });
    }

    async update(id: string, data: UpdateRfqInput) {
        const { ConnectionDesignerIds,connectionEngineerIds, multipleRecipients, ...rest } = data;
        return await prisma.rFQ.update({
            where: { id },
            data: {
                ...rest,
                multipleRecipients: multipleRecipients?.length
                  ? { set: [], connect: multipleRecipients.map((id: string) => ({ id })) }
                  : undefined,
                connectionDesignerRFQ: ConnectionDesignerIds
        ? {
             set: [],
            connect: ConnectionDesignerIds.map(id => ({ id }))
          }
        : undefined,
        connectionEngineers: connectionEngineerIds
        ? {
             set: [],
            connect: connectionEngineerIds.map(id => ({ id }))
          }
        : undefined,
            },include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });
    }

    async getAllRFQ(){
        return await prisma.rFQ.findMany({
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async findPendingRFQsForClientAdmin(userId:string){
        const fabricator = await prisma.fabricator.findFirst({
            where: {
                pointOfContact: {
                    some: {
                        id: userId,
                        role: "CLIENT_ADMIN"
                    }
                },
                project: { some: { status: { in: ["ACTIVE", "ONHOLD"] } } }
            }
        })
        return await prisma.rFQ.findMany({
            where: {
                            fabricator:{id:fabricator?.id},
                            project: { status: { in: ["ACTIVE", "ONHOLD"] } },
                            responses:{some:{
                                childResponses:{
                                    none:{}}
                            }}
                        },
                    include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    include:{
                        CDEngineers: true,
                        CDQuotations:true,
                    }
                },
                CDQuotas:true,
            }
        })
    }


    async findPendingRFQsForClient(userId:string){
        return await prisma.rFQ.findMany({
            where: {
                fabricator:{
                    pointOfContact:{
                        some:{
                            id:userId
                        }
                    }
                },
                project: { status: { in: ["ACTIVE", "ONHOLD"] } },
                responses:{some:{
                    childResponses:{
                        none:{}}
                }}
            },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    include:{
                        CDEngineers: true,
                        CDQuotations:true,
                    }
                },
                CDQuotas:true,
            }
        })
    }
    async getById(data:GetRfqInput) {
        return await prisma.rFQ.findUnique({
            where: { id: data.id },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    include:{
                        CDEngineers: true,
                        CDQuotations:true,
                    }
                },
                estimations:{select:{id:true}},
                followUps: {
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                firstName: true,
                                middleName: true,
                                lastName: true,
                                username: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                },
                CDQuotas:{
                    include:{
                        connectionDesigner:{select:{name:true}},
                    }
                },
            }
        });
    }

    async getByIdForConnectionDesigner(id: string, connectionDesignerId: string) {
        return await prisma.rFQ.findUnique({
            where: { id },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    where: { id: connectionDesignerId },
                    include:{
                        CDEngineers: true,
                        CDQuotations:{
                            where: { rfqId: id }
                        },
                    }
                },
                estimations:{select:{id:true}},
                followUps: {
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                firstName: true,
                                middleName: true,
                                lastName: true,
                                username: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                },
                CDQuotas:{
                    where: { connectionDesignerId }
                },
            }
        });
    }
    
    async getByName(id:string) {
        return await prisma.rFQ.findUnique({
            where: { id:id },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                project: {select:{name:true}},
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });

    }
    async sentTouser(senderId:string, projectId?: string){
        return await prisma.rFQ.findMany({
            where:{
                senderId,
                ...(projectId ? { project: { id: projectId } } : {}),
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async Inbox(recipientId:string, projectId?: string){
        return await prisma.rFQ.findMany({
            where: {
                ...(projectId ? { project: { id: projectId } } : {}),
                OR: [
                    { recipientId },
                    { multipleRecipients: { some: { id: recipientId } } }
                ]
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async findByProject(projectId: string) {
        return await prisma.rFQ.findMany({
            where: {
                project: { id: projectId },
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator: true,
                project: { select: { name: true } },
                connectionEngineers: { select: { firstName: true, lastName: true, id: true } },
                connectionDesignerRFQ: {
                    include: {
                        CDEngineers: true,
                        CDQuotations: true,
                    }
                },
                CDQuotas: {
                    include: {
                        connectionDesigner: { select: { name: true } },
                    }
                },
            }
        });
    }

    async closeRfq(id: string) {
        return await prisma.rFQ.update({
            where: { id },
            data: { status: "CLOSED" },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                project: {select:{name:true}},
            }
        })
    }

    async getPendingRFQs(){
        return await prisma.rFQ.findMany({
            where: {
          responses: { none: {} },
        },
        include:{
            sender: true,
            recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
            salesPerson: true,
            responses: RFQ_RESPONSES_INCLUDE,
            fabricator:true,
            project: {select:{name:true}},
        }
        })
    }
getbyProjectNameAndLocation(projectName:string,location:string){
    return prisma.rFQ.findFirst({
        where:{
            projectName,
            location
        },include:{
            sender: true,
            recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
            salesPerson: true,
            responses: RFQ_RESPONSES_INCLUDE,
            fabricator:true,
            project: {select:{name:true}},
        }
    });
    }
async deleteRFQ(id:string){
    return await prisma.rFQ.delete({
        where:{
            id
        }
    })
}

async getRFQOfConnectionEngineer(userId:string){
    return await prisma.rFQ.findMany({
        where:{
            connectionEngineers:{some:{
                id:userId
            }
        },
        },
          include:{
           sender: true,
            recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
            salesPerson: true,
            responses: RFQ_RESPONSES_INCLUDE,
            fabricator:true,
            project: {select:{name:true}},
        }
        })
    }

    async findPendingRFQsForProjectManager(managerId: string) {
        return await prisma.rFQ.findMany({
            where: {
                project: { managerID: managerId },
                responses: {
                    some: {
                        childResponses: { none: {} },
                    },
                },
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator: true,
                project: { select: { name: true } },
            },
        });
    }

    async findNewRFQsForProjectManager(managerId: string) {
        return await prisma.rFQ.findMany({
            where: {
                project: { managerID: managerId },
                responses: { none: {} },
            },
            include: {
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                responses: RFQ_RESPONSES_INCLUDE,
                fabricator: true,
                project: { select: { name: true } },
            },
        });
    }

}
