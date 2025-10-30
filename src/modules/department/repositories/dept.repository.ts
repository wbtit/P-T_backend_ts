import { CreateDeptInput,
        UpdateDeptInput,
        GetDeptInput,
        DeleteDeptInput,
        FindByNameInput 
 } from "../dtos";

 import prisma from "../../../config/database/client";

 export class DeptRepository{
    async create(data: CreateDeptInput) {
    const { name, managerIds } = data;

    const dept = await prisma.department.create({
      data: {
        name,
        managerIds: {
          connect: managerIds.map((id) => ({ id })),
        },
      },
    });
    return dept;
  }

  async update(data: UpdateDeptInput) {
    const { id, name, managerIds } = data;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name,
        ...(managerIds && {
          managerIds: {
            set: [], // optional: clear old managers first
            connect: managerIds.map((id) => ({ id })),
          },
        }),
      },
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
                managerIds:true,
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
    async findByName(data:string){
        const dept = await prisma.department.findUnique({
        where: { name: data}
        });
        return dept;
    }
 }