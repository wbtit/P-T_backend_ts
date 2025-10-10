import { Request,Response } from "express";
import { EmployeeServices } from "../service/employee.service";
import { userRole } from "../../dtos";

export class EmployeeController{
    empService = new EmployeeServices()
    
    async handleCreateEmp(req:Request,res:Response){
        const result = await this.empService.create(req.body);
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
        res.status(200).json({ success: true, data: result });
    }
    
    async handleDeletEmployee(req:Request,res:Response){
        const result = await this.empService.delete(req.params.id)
         res.status(200).json({ success: true, data: result });
    }

}