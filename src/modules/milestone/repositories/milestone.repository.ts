import prisma from "../../../config/database/client";
import { cleandata } from "../../../config/utils/cleanDataObject";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class MileStoneRepository{
    async create(data:CreateMileStoneDto){
        const cleanData= cleandata(data)
        return await prisma.$transaction(async (tx) => {
            const project = await tx.project.findUnique({
                where: { id: cleanData.project_id },
                select: { projectCode: true, projectNumber: true },
            });
            if (!project) {
                throw new AppError("Project not found for milestone serial generation", 404);
            }

            const serialNo = await generateProjectScopedSerial(tx, {
                prefix: SERIAL_PREFIX.MILESTONE,
                projectScopeId: cleanData.project_id,
                projectToken: project.projectCode ?? project.projectNumber,
            });

            return tx.mileStone.create({
                data: {
                    ...cleanData,
                    serialNo,
                },
            });
        });
    }
    async update(data:UpdateMileStoneDto,id:string){
        const cleanData = cleandata(data)
        return await prisma.mileStone.update({
            where:{id},
            data:cleanData
        })
    }
    updateCompletion(id:string, completionPercentage:number){
        return prisma.mileStone.update({
            where:{id},
            data:{completeionPercentage:completionPercentage}
        })
    }   
    async getAll(){
        return await prisma.mileStone.findMany({
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async getById(id:string){
        return await prisma.mileStone.findUnique({
            where:{id},
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async delete(id:string){
        return await prisma.mileStone.delete({
            where:{id}
        })
    }
    async getByProject(id:string){
        return await prisma.mileStone.findMany({
            where:{project_id:id},
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }

    async getPendingSubmittals(){
        return await prisma.mileStone.findMany({
            where:{
                mileStoneSubmittals:{none:{}}
            },
            include:{
                project:{select:{name:true}},
                fabricator:{select:{fabName:true}}
            }
        })
    }
    async getPendingSubmittalsByFabricator(fabricatorId:string){
        return await prisma.mileStone.findMany({
            where:{
                fabricator_id:fabricatorId,
                mileStoneSubmittals:{none:{}}
            },
            include:{
                project:{select:{name:true}},
                fabricator:{select:{fabName:true}}
            }
        })
    }
    async getPendingSubmittalsForClient(clientId:string){
        return await prisma.mileStone.findMany({
            where:{
                fabricator:{
                    pointOfContact:{some:{id:clientId}}
                }
            },
            include:{
                project:{select:{name:true}},
                fabricator:{select:{fabName:true}}
            }
        })       
}
}
