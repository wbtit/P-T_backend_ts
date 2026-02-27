import { AppError} from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { DeptService } from "../services";
import {Request,Response} from "express"
import { notifyByRoles } from "../../../utils/notifyByRole";
import { UserRole } from "@prisma/client";

const deptService = new DeptService();
const DEPT_NOTIFY_ROLES: UserRole[] = ["ADMIN", "DEPUTY_MANAGER", "HUMAN_RESOURCE"];

export class DeptController{
    async handleCreateDept(req:AuthenticateRequest,res:Response){
        const data= req.body;
        const user = req?.user
        const existing = await deptService.findByName(data);
        
        if (existing.dept) {
            throw new AppError("Department already exists", 409);
        }
        if( user){
            const result = await deptService.create(data,user?.id);
            await notifyByRoles(DEPT_NOTIFY_ROLES, {
                type: "DEPARTMENT_CREATED",
                title: "Department Created",
                message: `Department '${result.dept.name}' was created.`,
                departmentId: result.dept.id,
                timestamp: new Date(),
            });
            res.status(201).json({
            message: "Department created successfully",
            data: result.dept
        });
        }
        
    }
    async handleUpdateDept(req:Request,res:Response){
        const data = req.body;
        const existing = await deptService.get(data);
        if (!existing) {
            throw new AppError("Department not found", 404);
        }
        const result = await deptService.update(data);
        await notifyByRoles(DEPT_NOTIFY_ROLES, {
            type: "DEPARTMENT_UPDATED",
            title: "Department Updated",
            message: `Department '${result.dept.name}' was updated.`,
            departmentId: result.dept.id,
            timestamp: new Date(),
        });
        res.status(200).json({
            message: "Department updated successfully",
            data: result.dept
        });
    }
    async handleGetDept(req:Request,res:Response){
        const {id} = req.params;
        const existing = await deptService.get({id});
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
        await notifyByRoles(DEPT_NOTIFY_ROLES, {
            type: "DEPARTMENT_DELETED",
            title: "Department Deleted",
            message: `Department '${result.dept.name}' was deleted.`,
            departmentId: result.dept.id,
            timestamp: new Date(),
        });
        res.status(200).json({
            message: "Department deleted successfully",
            data: result.dept
        });
    }
}
