import { AppError} from "../../../config/utils/AppError";
import { DeptService } from "../services";
import {Request,Response} from "express"

const deptService = new DeptService();

export class DeptController{
    async handleCreateDept(req:Request,res:Response){
        const data= req.body;
        
        const existing = await deptService.findByName(data);
        
        if (existing.dept) {
            throw new AppError("Department already exists", 409);
        }
        const result = await deptService.create(data);
        res.status(201).json({
            message: "Department created successfully",
            data: result.dept
        });
    }
    async handleUpdateDept(req:Request,res:Response){
        const data = req.body;
        const existing = await deptService.get(data);
        if (!existing) {
            throw new AppError("Department not found", 404);
        }
        const result = await deptService.update(data);
        res.status(200).json({
            message: "Department updated successfully",
            data: result.dept
        });
    }
    async handleGetDept(req:Request,res:Response){
        const data = req.body;
        const existing = await deptService.get(data);
        if (!existing) {
            throw new AppError("Department not found", 404);
        }
        res.status(200).json({
            message: "Department retrieved successfully",
            data: existing.dept
        });
    }
    async handleGetAllDepts(req:Request,res:Response){
        const result = await deptService.getAll();
        res.status(200).json({
            message: "Departments retrieved successfully",
            data: result.depts
        });
    }
    async handleDeleteDept(req:Request,res:Response){
        const data = req.body;
        const existing = await deptService.get(data);
        if (!existing) {
            throw new AppError("Department not found", 404);
        }
        const result = await deptService.delete(data);
        res.status(200).json({
            message: "Department deleted successfully",
            data: result.dept
        });
    }
}