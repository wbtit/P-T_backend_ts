import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { paginate } from "../../../utils/pagination";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput,
    RfqPaginationQuery
 } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

type CreateRfqPersistInput = Omit<CreateRfqInput, "recipientId"> & {
  recipientId: string;
  serialNo: string;
};



export const RFQ_LIST_SELECT = {
  id: true,
  serialNo: true,
  projectName: true,
  wbtStatus: true,
  status: true,
  sender: { select: { firstName: true, lastName: true, id: true } },
  MTOManual: true,
  isMTOStickModel: true,
  MTOStickModel: true,
  MTOValue: true,
  detailingMain: true,
  detailingMisc: true,
  miscDesign: true,
  customerDesign: true,
  connectionDesign: true,
  createdAt: true,
  RFQDueDate: true,
  estimationDate: true,
  fabricator: { select: { fabName: true, id: true } },
  project: { select: { name: true, isAwarded: true } }
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
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });
    }

    async getAllRFQ(query: RfqPaginationQuery){
        return await paginate(prisma.rFQ, {
            where: {
                isDeleted: false,
                ...(query.status ? { status: query.status } : {}),
                ...(query.searchByProjectName
                    ? {
                        projectName: {
                            contains: query.searchByProjectName,
                            mode: "insensitive" as Prisma.QueryMode,
                        },
                      }
                    : {}),
            },
            select: RFQ_LIST_SELECT,
            orderBy: { createdAt: "desc" },
        }, query)
    }

    async findClientSidePendingRFQs() {
        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                project: { status: { in: ["ACTIVE", "ONHOLD"] } },
                status: { in: ["SENT", "REVISE"] },
            },
            select: RFQ_LIST_SELECT,
            orderBy: { createdAt: "desc" },
        });
    }

    async findPendingRFQsForClientAdmin(userId:string){
        const rfqs = await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                fabricator: {
                    pointOfContact: {
                        some: {
                            id: userId,
                            role: "CLIENT_ADMIN"
                        }
                    }
                },
                status: "WBT_SUBMITTED",
            },
            select: RFQ_LIST_SELECT
        })
        return rfqs;
    }


    async findPendingRFQsForClient(userId:string){
        return await prisma.rFQ.findMany({
            where: {
                senderId: userId,
                responses: {
                    some: {
                        childResponses: { none: {} },
                        user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                    },
                },
                isDeleted: false
            },
            select: RFQ_LIST_SELECT
        })
    }
    async getById(data:GetRfqInput) {
        return await prisma.rFQ.findUnique({
            where: { id: data.id, isDeleted: false },
            include:{
                sender: {select: {
                                id: true,
                                firstName: true,
                                middleName: true,
                                lastName: true,
                                username: true,
                                email: true,
                            }},
                recipient: {select: {
                                id: true,
                                firstName: true,
                                middleName: true,
                                lastName: true,
                                username: true,
                                email: true,
                            }},
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                fabricator:{
                    select:{
                        id:true,
                        fabName:true,
                        fabStage:true,
                    }
                },
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    include:{
                        CDEngineers: true,
                       
                    }
                },
                estimations:{select:{id:true}},
                CDQuotas:{
                    include:{
                        connectionDesigner:{select:{name:true}},
                    }
                },
            }
        });
    }

    async getResponsesByRfqId(rfqId: string, user: any) {
        let whereCondition: any = {
            rfqId,
            parentResponseId: null,
        };

        if (user.role.startsWith("CONNECTION_DESIGNER")) {
            whereCondition.user = {
                role: {
                    notIn: [
                        "CLIENT", 
                        "CLIENT_ADMIN", 
                        "CLIENT_ACCOUNTANT", 
                        "CLIENT_ESTIMATOR", 
                        "CLIENT_PROJECT_COORDINATOR", 
                        "CLIENT_GENERAL_CONSTRUCTOR"
                    ],
                }
            };
        } else if (user.role.startsWith("CLIENT")) {
            whereCondition.user = {
                role: {
                    notIn: [
                        "CONNECTION_DESIGNER_ENGINEER", 
                        "CONNECTION_DESIGNER_ADMIN"
                    ],
                }
            };
        }

        return await prisma.rFQResponse.findMany({
            where: whereCondition,
            include: {
                user: true,
                childResponses: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getByIdForConnectionDesigner(id: string, connectionDesignerId: string) {
        return await prisma.rFQ.findUnique({
            where: { id, isDeleted: false },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
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
                CDQuotas:{
                    where: { connectionDesignerId }
                },
            }
        });
    }
    
    async getByName(id:string) {
        return await prisma.rFQ.findUnique({
            where: { id:id, isDeleted: false },
            include:{
                sender: true,
                recipient: true,
                multipleRecipients: { select: { id: true, firstName: true, lastName: true, email: true } },
                salesPerson: true,
                project: {select:{name:true}},
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });

    }
    async sentTouser(query: RfqPaginationQuery, senderId:string, projectId?: string){
        return await paginate(prisma.rFQ, {
            where:{
                isDeleted: false,
                senderId,
                ...(projectId ? { project: { id: projectId } } : {}),
            },
            select: RFQ_LIST_SELECT,
            orderBy: { createdAt: "desc" },
        }, query)
    }

    async Inbox(query: RfqPaginationQuery, recipientId:string, projectId?: string){
        return await paginate(prisma.rFQ, {
            where: {
                isDeleted: false,
                ...(projectId ? { project: { id: projectId } } : {}),
                OR: [
                    { recipientId },
                    { multipleRecipients: { some: { id: recipientId } } }
                ]
            },
            select: RFQ_LIST_SELECT,
            orderBy: { createdAt: "desc" },
        }, query)
    }

    async findByProject(projectId: string) {
        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                project: { id: projectId },
            },
            select: RFQ_LIST_SELECT
        });
    }

    async findFabricatorIdsForUser(userId: string) {
        const fabricators = await prisma.fabricator.findMany({
            where: {
                isDeleted: false,
                OR: [
                    { createdById: userId },
                    { pointOfContact: { some: { id: userId } } },
                    { wbtFabricatorPointOfContact: { some: { id: userId } } },
                ],
            },
            select: { id: true },
        });

        return fabricators.map((fabricator) => fabricator.id);
    }

    async findByFabricatorIds(fabricatorIds: string[]) {
        if (fabricatorIds.length === 0) return [];

        const rfqs = await prisma.rFQ.findMany({
            where: {
                fabricatorId: { in: fabricatorIds },
                isDeleted: false,
            },
            select: {
                ...RFQ_LIST_SELECT,
                responses: {
                    select: { createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return rfqs.map((rfq) => {
            const { responses, ...rest } = rfq;
            return {
                ...rest,
                latestResponseDate: responses.length > 0 ? responses[0].createdAt : null,
            };
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
                project: {select:{name:true}},
            }
        })
    }

    async getPendingRFQs(){
        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
          wbtStatus: { in: ["RECEIVED", "REVISE"] },
        },
        select: RFQ_LIST_SELECT
        })
    }
getbyProjectNameAndLocation(projectName:string,location:string){
    return prisma.rFQ.findFirst({
        where:{
            projectName,
            location,
            isDeleted: false,
        },select: RFQ_LIST_SELECT
    });
    }

async findDuplicateForCreate(tx: Prisma.TransactionClient | typeof prisma, projectName: string, location: string, subject: string) {
    return tx.rFQ.findFirst({
        where: {
            isDeleted: false,
            projectName: { equals: projectName, mode: "insensitive" },
            location: { equals: location, mode: "insensitive" },
            subject: { equals: subject, mode: "insensitive" },
        },
        select: RFQ_LIST_SELECT
    });
}
async deleteRFQ(id:string){
    return await prisma.rFQ.update({
        where:{
            id
        },
        data: {
            isDeleted: true
        }
    })
}

async getRFQOfConnectionEngineer(userId:string){
    return await prisma.rFQ.findMany({
        where:{
            isDeleted: false,
            connectionEngineers:{some:{
                id:userId
            }
        },
        },
          select: RFQ_LIST_SELECT
        })
    }

    async findPendingRFQsForDepartmentManager(managerId: string) {
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
            select: { departmentId: true },
        });
        if (!manager?.departmentId) return [];

        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                wbtStatus: { in: ["RECEIVED", "REVISE"] },
            },
            select: RFQ_LIST_SELECT,
        });
    }

    async findPendingRFQsForProjectManager(managerId: string) {
        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                wbtStatus: { in: ["RECEIVED", "REVISE"] },
            },
            select: RFQ_LIST_SELECT,
        });
    }

    async findNewRFQsForProjectManager(managerId: string) {
        return await prisma.rFQ.findMany({
            where: {
                isDeleted: false,
                responses: { none: {} },
            },
            select: RFQ_LIST_SELECT,
        });
    }

    async findRFQsForClientEstimator(userId: string) {
        const fabricators = await prisma.fabricator.findMany({
          where: {
            pointOfContact: {
              some: { id: userId, role: "CLIENT_ESTIMATOR" },
            },
          },
          select: { id: true },
        });

        const fabricatorIds = fabricators.map((f) => f.id);
        if (fabricatorIds.length === 0) return [];

        return await prisma.rFQ.findMany({
            where: {
                fabricatorId: { in: fabricatorIds },
                sender: { role: "CLIENT_ESTIMATOR" },
                responses: {
                    some: {
                        childResponses: { none: {} },
                        user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                    },
                },
                isDeleted: false
            },
            select: RFQ_LIST_SELECT,
            orderBy: { createdAt: "desc" }
        });
    }

}
