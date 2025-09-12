import { CreateDeptInput,
        UpdateDeptInput,
        GetDeptInput,
        DeleteDeptInput,
        FindByNameInput 
 } from "../dtos";

 import prisma from "../../../config/database/client";

 export class DeptRepository{
    async create(data:CreateDeptInput){
        const dept = await prisma.department.create({
            data
        });
        return dept;
    }

    async update(data:UpdateDeptInput){
        const dept = await prisma.department.update({
            where: { id: data.id },
            data
        });
        return dept;
    }

    async get(data:GetDeptInput){
        const dept = await prisma.department.findUnique({
            where: { id: data.id },
            include:{
                users:true,
                projects:true,
                teams:true,
                tasks:true,
                manager:true,
            }
        });
        return dept;
    }
    async getAll(){
        const depts = await prisma.department.findMany();
        return depts;
    }

    async delete(data:DeleteDeptInput){
        const dept = await prisma.department.update({
            where: { id: data.id },
            data: { isDeleted: true }
        });
        return dept;
    }
    async findByName(data:FindByNameInput){
        const dept = await prisma.department.findUnique({
        where: { name: data.name }
        });
        return dept;
    }
 }