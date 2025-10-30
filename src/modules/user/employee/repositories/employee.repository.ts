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
        return await prisma.user.findMany()
    }
    
}