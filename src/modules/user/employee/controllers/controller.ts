import { Request,Response } from "express";
import { EmployeeServices } from "../service/service";
import { userRole } from "../../dtos";

export class EmployeeController{
    empService = new EmployeeServices
    
    async create(req:Request,res:Response){
        const result = await this.empService.create(req.body);
        res.status(201).json({success:true,data:result});
    }

    async allEmployees(req:Request,res:Response){
        const result = await this.empService.allEmployees();
        res.status(201).json({success:true,data:result});
    }

    async EmployeesByRole(req:Request,res:Response){
        const role = req.params.role as userRole;
        const result = await this.empService.employeeByRole(role);
        res.status(201).json({success:true,data:result});
    }

    async empById(req:Request,res:Response){
        const result = await this.empService.read({ id: req.params.id });
        res.status(200).json({ success: true, data: result });
    }

    async updateProfile(req:Request,res:Response){
        const result = await this.empService.update(req.params.id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    
    async deletEmployee(req:Request,res:Response){
        const result = await this.empService.delete(req.params.id)
         res.status(200).json({ success: true, data: result });
    }

}