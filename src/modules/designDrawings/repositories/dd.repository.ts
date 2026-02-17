import prisma from "../../../config/database/client";
import { CreateDesignDrawingsInput,
    UpdateDesignDrawingsInput,
    UpdateDesignDrawingsResponsesInput,
    CreateDesignDrawingsResponsesInput 
} from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";

export class DesignDrawingsRepository {
    async createDesignDrawings(data: CreateDesignDrawingsInput,userId:string) {
        return await prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: data.projectId },
            select: { projectCode: true, projectNumber: true },
          });

          const serialNo = await generateProjectScopedSerial(tx, {
            prefix: SERIAL_PREFIX.DESIGN_DRAWING,
            projectScopeId: data.projectId,
            projectToken: project?.projectCode ?? project?.projectNumber ?? data.projectId,
          });

          return tx.designDrawings.create({
            data: {
              serialNo,
              projectId:data.projectId,
              description:data.description,
              stage:data.stage,
              files: data.files,
              uploadedBy: userId,
            },
          });
        });
    }
    async getDDByProjectId(projectId:string){
        return await prisma.designDrawings.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true,lastName:true,firstName:true, middleName: true, email: true },
        },
        responses: {
          include: {
            user: {
              select: { id: true, lastName: true, firstName: true, middleName: true, email: true },
            },
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });
    }
    async updateStage(id:string,stage:string,data:UpdateDesignDrawingsInput){
        return await prisma.designDrawings.update({
      where: { id },
      data: { stage:data.stage, description:data.description },
    });
    }
    async getAllDDs(){
        return await prisma.designDrawings.findMany({
      include: {
        user: {
          select: { id: true, lastName: true, firstName: true, middleName: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
        responses: {
          include: {
            user: {
              select: { id: true, lastName: true, firstName: true, middleName: true, email: true },
            },
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });
    }
    async findDDById(id:string){
        return await prisma.designDrawings.findUnique({
      where: { id },
        })
    }
    async deleteDD(id:string){
        return await prisma.designDrawings.delete({
      where: { id },
        })
    }

    // Responses
    async createResponse(data:CreateDesignDrawingsResponsesInput,userId:string){
        return await prisma.designDrawingsResponses.create({
      data:{
        status:data.status,
        reason:data.reason,
        userId:userId,
        files:data.files,
        designDrawingsId:data.designDrawingsId,
        parentResponseId:data.parentResponseId||null
      },
      
    })
    }
    async getResponse(id:string){
        return await prisma.designDrawingsResponses.findMany({
      where: {
        designDrawingsId: id,
      },
    });
    }
    async getResponseById(id:string){
        return await prisma.designDrawingsResponses.findUnique({
      where: { id },
        })
    }
        
}
