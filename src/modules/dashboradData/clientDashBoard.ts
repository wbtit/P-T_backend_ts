import prisma from "../../config/database/client";
import { AuthenticateRequest } from "../../middleware/authMiddleware";
import { Response } from "express";

export const clientDashBoard = async (req: AuthenticateRequest, res: Response) => {
    try {
        const projectStats = await prisma.project.groupBy({
        by:["status"],
        _count:{_all:true},
        where:{
            fabricator:{pointOfContact:{some:{id:req.user?.id}}}
        }
    })
    const totalProjects = await prisma.project.count({
        where:{
            fabricator:{pointOfContact:{some:{id:req.user?.id}}}
        }
    })
    const activeEmployeeCount = await prisma.user.count({ where: { isActive: true } });
    const newRFI = await prisma.rFI.count({
                        where: {
                            fabricator:{pointOfContact:{some:{id:req.user?.id}}},
                            rfiresponse: { none: {} },
                        },
                    });
    const pendingChangeOrders = await prisma.changeOrder.count({
                where:{
                    Recipients:{FabricatorPointOfContacts:{
                        some:{
                            id:req.user?.id,
                        }
                    }},
                    coResponses:{none:{}}
                }
        })
    const pendingRFQ = await prisma.rFQ.count({
                        where: {
                          responses: { none: {} },
                        },
                    });
    const pendingSubmittals = await prisma.submittals.count({
                        where: {
                           currentVersion:{
                            responses:{none:{}},
                           }
                        },
                    });
    const response:Record<string,any>={
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
    const statusMap:Record<string,keyof typeof response>= {
            ACTIVE: "totalActiveProjects",
            COMPLETE: "totalCompleteProject",
            ONHOLD: "totalOnHoldProject",
    }
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
        return res.status(500).json({
            message: "Error fetching client dashboard data",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
    }
    
}
