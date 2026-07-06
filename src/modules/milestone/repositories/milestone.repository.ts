import prisma from "../../../config/database/client";
import { cleandata } from "../../../config/utils/cleanDataObject";
import { CreateMileStoneDto,UpdateMileStoneDto } from "../dtos";
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";
import { getRoleVisibilityFilter } from "../../../utils/roleFilter";
import { UserRole } from "@prisma/client";

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
    async getAll(role?: UserRole){
        return await prisma.mileStone.findMany({
            where: getRoleVisibilityFilter(role),
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async getAllByFabricator(fabricatorId: string, role?: UserRole) {
        return await prisma.mileStone.findMany({
            where: {
                fabricator_id: fabricatorId,
                project: {
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async getAllForClient(clientId: string, role?: UserRole) {
        return await prisma.mileStone.findMany({
            where: {
                project: {
                    clientProjectManagers: { some: { id: clientId } },
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async getByProjectIdAndFabricator(projectId: string, fabricatorId: string, role?: UserRole) {
        return await prisma.mileStone.findMany({
            where: {
                project_id: projectId,
                fabricator_id: fabricatorId,
                project: {
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }
    async getByProjectIdAndClient(projectId: string, clientId: string, role?: UserRole) {
        return await prisma.mileStone.findMany({
            where: {
                project_id: projectId,
                project: {
                    clientProjectManagers: { some: { id: clientId } },
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
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
                Tasks:{
                    select:{
                        id:true,
                        due_date:true,
                        name:true,
                        wbsType:true,
                        status:true,
                        user_id:true,
                        user:{select:{firstName:true,middleName:true,lastName:true}}
                    }
                },
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    include:{
                        responses:{
                            where: { parentResponseId: null },
                            include: {
                                childResponses: true,
                                user: true
                            }
                        }
                    },
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
    async getByProject(id:string, role?: UserRole){
        return await prisma.mileStone.findMany({
            where:{project_id:id,
                project:{
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:true,
                Tasks:true,
                fabricator:true,
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
                currentVersion: true,
                versions: {
                    orderBy: {
                        versionNumber: "desc",
                    },
                },
            }
        })
    }

    async getPendingSubmittals(role?: UserRole){
        return await prisma.mileStone.findMany({
            where:{
                mileStoneSubmittals:{none:{}},
                legacySubmittals:{none:{}},
                project: {
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:{select:{name:true}},
                fabricator:{select:{fabName:true}},
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
            }
        })
    }
    async getPendingSubmittalsByFabricator(fabricatorId:string, role?: UserRole){
        if (!fabricatorId) return [];
        return await prisma.mileStone.findMany({
            where:{
                fabricator_id:fabricatorId,
                mileStoneSubmittals:{none:{}},
                legacySubmittals:{none:{}},
                project: {
                    isDeleted: false,
                },
                ...getRoleVisibilityFilter(role),
            },
            include:{
                project:{select:{name:true}},
                fabricator:{select:{fabName:true}},
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
            }
        })
    }
    async getPendingSubmittalsForClient(clientId: string, role?: UserRole) {
        return await prisma.mileStone.findMany({
            where: {
                project:{
                    clientProjectManagers: { some: { id: clientId } },
                    isDeleted: false,
                },
                mileStoneSubmittals: { none: {} },
                legacySubmittals: { none: {} },
                ...getRoleVisibilityFilter(role),
            },
            include: {
                project: { select: { name: true } },
                fabricator: { select: { fabName: true } },
                mileStoneSubmittals: {
                    include: {
                        submittal: true,
                    },
                },
            },
        });
    }

 async getPendingSubmittalsForProjectManager(managerId:string, role?: UserRole){
    return await prisma.mileStone.findMany({
        where:{
            project:{
                managerID:managerId,
                isDeleted: false,
            },
            mileStoneSubmittals:{none:{}},
            legacySubmittals:{none:{}},
            ...getRoleVisibilityFilter(role),
        },
        include:{
            project:{select:{name:true}},
            fabricator:{select:{fabName:true}},
            mileStoneSubmittals: {
                include: {
                    submittal: true,
                },
            },
        }
    })
 }

 async getPendingSubmittalsForConnectionDesignerEngineer(params:{
    userId:string,
    connectionDesignerId?:string | null,
    role?: UserRole
 }){
    const { userId, connectionDesignerId, role } = params;
    return await prisma.mileStone.findMany({
        where:{
            project:{
                OR: [
                    {
                        pocOfConnectionDesigner:{
                            some:{id:userId}
                        },
                    },
                    ...(connectionDesignerId
                        ? [{ connectionDesignerID: connectionDesignerId }]
                        : []),
                ],
                isDeleted: false,
            },
            CDApprovalDate:{not:null},
            mileStoneSubmittals:{none:{}},
            legacySubmittals:{none:{}},
            ...getRoleVisibilityFilter(role),
        },
        include:{
            project:{select:{name:true}},
            fabricator:{select:{fabName:true}},
            mileStoneSubmittals: {
                include: {
                    submittal: true,
                },
            },
        }
    })
 }


 async getByProjectIdForConnectionDesignerEngineer(projectId:string, connectionDesignerId:string, role?: UserRole){
    return await prisma.mileStone.findMany({
        where:{
            project_id:projectId,
            project:{
                OR: [
                    {
                        pocOfConnectionDesigner:{
                            some:{id:connectionDesignerId}
                        },
                    },
                    { connectionDesignerID: connectionDesignerId },
                ],
                isDeleted: false,
            },
            CDApprovalDate:{not:null},
            ...getRoleVisibilityFilter(role),
        },
        include:{
            project:{select:{name:true}},
            fabricator:{select:{fabName:true}},
            mileStoneSubmittals: {
                include: {
                    submittal: true,
                },
            },
        }
    })
 }
}
