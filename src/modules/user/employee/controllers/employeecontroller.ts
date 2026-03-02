import { Request,Response } from "express";
import { EmployeeServices } from "../service/employee.service";
import { userRole } from "../../dtos";
import { notifyByRoles } from "../../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

export class EmployeeController{
    empService = new EmployeeServices()
    private readonly userTeamNotifyRoles: UserRole[] = ["ADMIN", "HUMAN_RESOURCE"];
    
    async handleCreateEmp(req:Request,res:Response){
        const result = await this.empService.create(req.body);
        const userName = result.user?.username?.trim();
        await notifyByRoles(this.userTeamNotifyRoles, {
            type: "USER_CREATED",
            title: "New User Created / Onboarded",
            message: userName
              ? `A new user '${userName}' was created.`
              : "A new user was created.",
            userId: result.user?.id ?? null,
            timestamp: new Date(),
        });
        res.status(201).json({success:true,data:result});
    }

    async handleGetAllEmployees(req:Request,res:Response){
        const result = await this.empService.allEmployees();
        res.status(201).json({success:true,data:result});
    }

    async handleGetEmployeesByRole(req:Request,res:Response){
        const role = req.params.role as userRole;
        const result = await this.empService.employeeByRole(role);
        res.status(201).json({success:true,data:result});
    }

    async handleGetEmployeeById(req:Request,res:Response){
        const result = await this.empService.read({ id: req.params.id });
        res.status(200).json({ success: true, data: result });
    }

    async handleUpdateProfile(req:Request,res:Response){
        const result = await this.empService.update(req.params.id, req.body);
        if (req.body?.role) {
            await notifyByRoles(this.userTeamNotifyRoles, {
                type: "USER_ROLE_CHANGED",
                title: "User Role Changed",
                message: `User role updated to '${req.body.role}'.`,
                userId: req.params.id,
                role: req.body.role,
                timestamp: new Date(),
            });
        }
        res.status(200).json({ success: true, data: result });
    }
    
    async handleDeletEmployee(req:Request,res:Response){
        const result = await this.empService.delete(req.params.id)
         res.status(200).json({ success: true, data: result });
    }

}
