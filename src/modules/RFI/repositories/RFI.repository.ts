import prisma from "../../../config/database/client";
import { 
    UpdateRFIDto,
    CreateRFIDto
} from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";
import { includes } from "zod";
import { UserRole } from "@prisma/client";
import { getRfiSubmittalVisibilityFilter } from "../../../utils/roleFilter";

export class RFIRepository{
    async create(data:CreateRFIDto,userId:string,isAproovedByAdmin:boolean){
        return await prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: data.project_id },
            select: { projectCode: true, projectNumber: true },
          });
          if (!project) {
            throw new AppError("Project not found for RFI serial generation", 404);
          }

          const serialNo = await generateProjectScopedSerial(tx, {
            prefix: SERIAL_PREFIX.RFI,
            projectScopeId: data.project_id,
            projectToken: project.projectCode ?? project.projectNumber,
          });

          return tx.rFI.create({
            data: {
              serialNo,
              fabricator_id:data.fabricator_id,
              project_id:data.project_id,
              recepient_id: data.recepient_id,
              multipleRecipients: data.multipleRecipients?.length
                ? { connect: data.multipleRecipients.map((id: string) => ({ id })) }
                : undefined,
              sender_id: userId,
              status: true,
              subject:data.subject,
              description:data.description,
              files: data.files,
              isAproovedByAdmin,
              approvedById: isAproovedByAdmin ? userId : null,
              isConnectionDesign: data.isConnectionDesign ?? false,
              exStatus: "RECEIVED",
              wbtStatus: "SENT",
            },
            include: {
              recepients:  {select:{firstName:true,middleName:true,lastName:true,username:true,designation:true,email:true,id:true}},
              multipleRecipients: {select:{id:true,firstName:true,lastName:true,username:true,designation:true,email:true}},
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
              project: true,
              sender :  {select:{firstName:true,middleName:true,lastName:true,username:true,designation:true,email:true,id:true}},
              rfiresponse:true
            },
          });
        });
    }

    async findPendingRFIsForClientAdmin(userId: string, role?: UserRole) {
      const fabricators = await prisma.fabricator.findMany({
            where: {
                pointOfContact: {
                    some: {
                        id: userId,
                        role: "CLIENT_ADMIN"
                    }
                }
            },
            select: { id: true }
      });
      const fabricatorIds = fabricators.map(f => f.id);

      return await prisma.rFI.findMany({
        where:{
          fabricator_id: { in: fabricatorIds },
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          OR: [
            {
              rfiresponse: { none: {} },
              sender: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
            },
            {
              rfiresponse: {
                some: {
                  childResponses: { none: {} },
                  responseState: { not: "COMPLETE" },
                    user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          ],
          ...getRfiSubmittalVisibilityFilter(role),
        },
        include: {
        fabricator:{select:{
          fabName:true,
          id:true,
        }},
        project: {select:{name:true}},
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        recepients: {
          include: {
            managedFabricator: {
              select: {
                fabName: true,
                branches:true,
              },
            },
          },
        },
        rfiresponse:{
          include:{
            childResponses:true
          }
        },
        
      },
      })
    }

    async findClientSidePendingRFIs(role?: UserRole) {
      return await prisma.rFI.findMany({
        where:{
          project: { status: { in: ["ACTIVE", "ONHOLD"] } },
          OR: [
            {
              rfiresponse: { none: {} },
              sender: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
            },
            {
              rfiresponse: {
                some: {
                  childResponses: { none: {} },
                  responseState: { not: "COMPLETE" },
                    user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          ],
          ...getRfiSubmittalVisibilityFilter(role),
        },
        include: {
          fabricator:{select:{
            fabName:true,
            id:true,
          }},
          project: {select:{name:true}},
          sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
          recepients: {
            include: {
              managedFabricator: {
                select: {
                  fabName: true,
                  branches:true,
                },
              },
            },
          },
          rfiresponse:{
            include:{
              childResponses:true
            }
          },
          multipleRecipients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } }
        },
        orderBy:{
          date:'desc'
        }
      })
    }

    async findPendingRFIsForClient(userId: string, role?: UserRole){
      return await prisma.rFI.findMany({
        where:{
          project:{
            clientProjectManagers: { some: { id: userId } }
          },
          OR: [
            {
              rfiresponse: { none: {} },
              sender: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
            },
            {
              rfiresponse: {
                some: {
                  childResponses: { none: {} },
                  responseState: { not: "COMPLETE" },
                    user: { role: { notIn: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          ],
          ...getRfiSubmittalVisibilityFilter(role),
        },include: {
        fabricator:{select:{
          fabName:true,
          id:true,
        }},
        project: {select:{name:true}},
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        multipleRecipients: {
          include: {
            managedFabricator: {
              select: {
                fabName: true,
                branches:true,
              },
            },
          },
        },
        rfiresponse:{
          include:{
            childResponses:true
          }
        },
        
      },
      })
    }


    async findById(id:string){
        return await prisma.rFI.findUnique({
      where: { id },
      include: {
        fabricator:{select:{
          fabName:true,
          id:true,
        }},
        project: {select:{name:true}},
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        multipleRecipients: {select:{id:true,firstName:true,lastName:true,email:true}},
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
        recepients: {
          include: {
            managedFabricator: {
              select: {
                fabName: true,
                branches:true,
              },
            },
          },
        },
        rfiresponse:{
          include:{
            user :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
            childResponses:{
              include:{
                user :{select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
            }
          }
        },
      },
    }
    });
    }
  


    async updateRFI(id: string, data: UpdateRFIDto & { approvedById?: string }) {
        const existing = await prisma.rFI.findUnique({
          where: { id },
        });
    
        if (!existing) {
          throw new Error("RFI not found");
        }
    
        const {
          subject,
          description,
          status,
          isAproovedByAdmin,
          files,
          isConnectionDesign,
          approvedById,
        } = data;
    
        return await prisma.rFI.update({
          where: { id },
          data: {
            subject: subject ?? existing.subject,
            description: description ?? existing.description,
            status: typeof status === "boolean" ? status : existing.status,
            isAproovedByAdmin:
              typeof isAproovedByAdmin === "boolean"
                ? isAproovedByAdmin
                : existing.isAproovedByAdmin,
            files: files ?? existing.files as any,
            isConnectionDesign: typeof isConnectionDesign === 'boolean' ? isConnectionDesign : existing.isConnectionDesign,
            approvedById: approvedById,
          },
          include: {
            approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
          },
        });
    }
    
    
    async senderRFI(userId:string, projectId?: string, role?: UserRole){
        return await prisma.rFI.findMany({
      where: {
        sender_id: userId,
        ...(projectId ? { project_id: projectId } : {}),
        ...getRfiSubmittalVisibilityFilter(role),
      },
      include: {
        fabricator: true,
        project: {select:{name:true}},
        recepients: {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        sender : {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true,
      },
    });
    }

    async inbox(userId:string,projectId:string, role?: UserRole){
        return await prisma.rFI.findMany({
      where: {
        project_id: projectId,
        ...getRfiSubmittalVisibilityFilter(role),
        OR: [
          { recepient_id: userId },
          { multipleRecipients: { some: { id: userId } } },
          {
            rfiresponse: {
              some: {
                OR: [
                  { userId },
                  { childResponses: { some: { userId } } },
                ],
              },
            },
          },
        ]
      },
      include: {
        fabricator: true,
        project: {select:{name:true}},
        recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        multipleRecipients: {select:{id:true,firstName:true,lastName:true,email:true}},
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true,
      },
    });
    }

    async findByProject(projectId: string, role?: UserRole) {
        return await prisma.rFI.findMany({
      where: {
        project_id: projectId,
        ...getRfiSubmittalVisibilityFilter(role),
      },
      include: {
        fabricator: true,
        project: {select:{name:true}},
        recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        multipleRecipients: {select:{id:true,firstName:true,lastName:true,email:true}},
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
        sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
        rfiresponse:true,
      },
    });
    }

    async updateStatus(id:string){
        return await prisma.rFI.update({
      where: {
        id,
      },
      data: {
        status: false,
      },
    });
    }

    async updateStatuses(id: string, exStatus: any, wbtStatus: any) {
        return await prisma.rFI.update({
            where: { id },
            data: {
                exStatus,
                wbtStatus
            }
        });
    }

    async findPendingRFIs(role: string, userRole?: UserRole){
      return await prisma.rFI.findMany({
        where: {
    ...getRfiSubmittalVisibilityFilter(userRole),
    OR: [
      {
        rfiresponse: { none: {} },
        sender: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
      },
      {
        rfiresponse: {
          some: {
            childResponses: { none: {} },
            user: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
          },
        },
      },
    ],
  },
        include: {
          fabricator: true,
          project: { select: { name: true } },
          multipleRecipients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
          sender: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          rfiresponse: true,
        },
      });
    }

    async findPendingRFIsForDepartmentManager(managerId: string, role?: UserRole) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { departmentId: true },
      });
      if (!manager?.departmentId) return [];

      return await prisma.rFI.findMany({
        where: {
          project: { departmentID: manager.departmentId },
          ...getRfiSubmittalVisibilityFilter(role),
          OR: [
            {
              rfiresponse: { none: {} },
              sender: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
            },
            {
              rfiresponse: {
                some: {
                  childResponses: { none: {} },
                  user: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          ],
        },
        include: {
          fabricator: true,
          project: { select: { name: true } },
          recepients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          multipleRecipients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
        approvedBy: { select: { id: true, firstName: true, middleName: true, lastName: true } },
          sender: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          rfiresponse: { include: { childResponses: true } },
        },
        orderBy: { date: "desc" },
      });
    }

    async findPendingRFIsForProjectManager(managerId: string, role?: UserRole) {
      return await prisma.rFI.findMany({
        where: {
          project: { managerID: managerId },
          ...getRfiSubmittalVisibilityFilter(role),
          OR: [
            {
              rfiresponse: { none: {} },
              sender: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
            },
            {
              rfiresponse: {
                some: {
                  childResponses: { none: {} },
                  user: { role: { in: ["CLIENT", "CLIENT_ADMIN", "CLIENT_ACCOUNTANT", "CLIENT_ESTIMATOR", "CLIENT_PROJECT_COORDINATOR", "CLIENT_GENERAL_CONSTRUCTOR"] } },
                },
              },
            },
          ],
        },
        include: {
          fabricator: true,
          project: { select: { name: true } },
          recepients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          sender: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          rfiresponse: true,
        },
      });
    }

    async findNewRFIsForProjectManager(managerId: string, role?: UserRole) {
      return await prisma.rFI.findMany({
        where: {
          project: { managerID: managerId },
          rfiresponse: { none: {} },
          ...getRfiSubmittalVisibilityFilter(role),
        },
        include: {
          fabricator: true,
          project: { select: { name: true } },
          recepients: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          sender: { select: { firstName: true, middleName: true, lastName: true, email: true, id: true } },
          rfiresponse: true,
        },
      });
    }
}
