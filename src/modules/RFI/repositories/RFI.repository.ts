import prisma from "../../../config/database/client";
import { 
    UpdateRFIDto,
    CreateRFIDto
} from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

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
              sender_id: userId,
              status: true,
              subject:data.subject,
              description:data.description,
              files: data.files,
              isAproovedByAdmin
            },
            include: {
              
              recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
              project: true,
              sender :  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
              rfiresponse:true
            },
          });
        });
    }

    async findPendingRFIsForClientAdmin(userId: string) {

     const fabricator = await prisma.fabricator.findFirst({
            where: {
                pointOfContact: {
                    some: {
                        id: userId,
                        role: "CLIENT_ADMIN"
                    }
                }
            },
            
        })
        if (!fabricator) {
            throw new Error("Fabricator not found for the client admin");
        }
      return await prisma.rFI.findMany({
        where:{
          fabricator_id:fabricator.id,
          rfiresponse:{
            none:{}
          }
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
    });
    }


    async updateRFI(id: string, data: UpdateRFIDto) {
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
          },
        });
    }
    
    
    async senderRFI(userId:string){
        return await prisma.rFI.findMany({
      where: {
        sender_id: userId,
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

    async inbox(userId:string){
        return await prisma.rFI.findMany({
      where: {
        recepient_id: userId,
      },
      include: {
        fabricator: true,
        project: {select:{name:true}},
        recepients:  {select:{firstName:true,middleName:true,lastName:true,email:true,id:true}},
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
    async findPendingRFIs(role: string){
      return await prisma.rFI.findMany({
        where: {
    NOT: {
      rfiresponse: {
        some: {
          childResponses: {
            some: {
              [role === "CLIENT" || role === "CLIENT_ADMIN"
                         ? "responseState"
                         : "wbtStatus"]: "COMPLETE",
            },
          },
        },
      },
    },
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

    async findPendingRFIsForProjectManager(managerId: string) {
      return await prisma.rFI.findMany({
        where: {
          project: { managerID: managerId },
          
            rfiresponse: {
              some: {
                childResponses: {
                  none: {},
                },
              },
            
          },
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

    async findNewRFIsForProjectManager(managerId: string) {
      return await prisma.rFI.findMany({
        where: {
          project: { managerID: managerId },
          rfiresponse: { none: {} },
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
