import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";


export const clientAdminDashBoard = async (req: AuthenticateRequest, res: Response) => {
    try {
        const fabricator = await prisma.fabricator.findFirst({
            where: {
                pointOfContact: {
                    some: {
                        id: req.user?.id,
                        role: "CLIENT_ADMIN"
                    }
                }
            }
        })
        const projectStats = await prisma.project.groupBy({
            by: ["status"],
            _count: { _all: true },
            where: {
                fabricator:{id:fabricator?.id
                }
            }
        })
        const totalProjects = await prisma.project.count({
            where: {
                fabricator:{id:fabricator?.id}
                }
                
        })

        const activeEmployeeCount = await prisma.user.count({ where: { isActive: true } });
        const newRFI = await prisma.rFI.count({
                            where: {
                                fabricator_id:fabricator?.id,
                                rfiresponse: { none: {} },
                        },
                    });
        const pendingChangeOrders = await prisma.changeOrder.count({
                where:{
                    Recipients:{FabricatorPointOfContacts:{
                        some:{
                            id:fabricator?.id,
                        }
                    }},
                    coResponses:{none:{}}
                }
        })
        const pendingRFQ = await prisma.rFQ.count({
                        where: {
                            fabricator:{id:fabricator?.id},
                          responses: { none: {} },
                        },
                    });
        const pendingSubmittals = await prisma.submittals.count({
                        where: {
                           fabricator:{id:fabricator?.id},
                           currentVersion:{
                            responses:{none:{}},
                           }
                        }
        })
        const response: Record<string, any> ={
            totalActiveProjects: 0,
            totalCompleteProject: 0,
            totalOnHoldProject: 0,
            totalProjects,
            activeEmployeeCount,
            pendingRFI:newRFI,
            pendingChangeOrders,
            pendingRFQ,
            pendingSubmittals
        }
        const statusMap: Record<string, keyof typeof response> = {
            ACTIVE: "totalActiveProjects",
            COMPLETE: "totalCompleteProject",
            ONHOLD: "totalOnHoldProject",
    };
    projectStats.forEach(({ status, _count }) => {
      const key = statusMap[status];
      if (key) response[key] = _count._all;
    });
        return res.status(200).json({
            message: " CLIENT_ADMIN Dashboard data fetched successfully",
            success: true,
            data: response,
          });
    } catch (error) {
        console.error("Error in DashBoradData:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }


}