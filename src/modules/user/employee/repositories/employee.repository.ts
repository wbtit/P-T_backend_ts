import prisma from "../../../../config/database/client";
import { userRole } from "../../dtos";


export class EmployeRepository{
    async getAllEmployesByRole(role:userRole){
        return await prisma.user.findMany({
            where:{
                role:role
            }
        })
    }

    async getAllEmployee(){
        return await prisma.user.findMany({
            where:{
                role:{
                    in:["STAFF","ADMIN","SALES_MANAGER","SALES_PERSON",
                        "SYSTEM_ADMIN","DEPT_MANAGER","ESTIMATION_HEAD",
                        "ESTIMATOR","PROJECT_MANAGER","TEAM_LEAD",
                        "PROJECT_MANAGER_OFFICER","DEPUTY_MANAGER",
                        "OPERATION_EXECUTIVE","HUMAN_RESOURCE",
                    ]
                }
            }
        })
    }
    
}