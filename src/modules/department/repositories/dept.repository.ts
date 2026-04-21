import {
  CreateDeptInput,
  UpdateDeptInput,
  GetDeptInput,
  DeleteDeptInput,
} from "../dtos";

import prisma from "../../../config/database/client";

export class DeptRepository {
  async create(data: CreateDeptInput, userId: string) {
    const { name, managerIds } = data;

    // Use a transaction so that if updating manager roles fails,
    // the department creation is also rolled back — no partial state.
    const dept = await prisma.$transaction(async (tx) => {
      const newDept = await tx.department.create({
        data: {
          name,
          managerIds: {
            connect: managerIds.map((id) => ({ id })),
          },
          createdById: userId,
        },
      });

      await tx.user.updateMany({
        where: { id: { in: managerIds } },
        data: {
          role: "DEPT_MANAGER",
          departmentId: newDept.id,
        },
      });

      return newDept;
    });

    return dept;
  }

  async update(data: UpdateDeptInput) {
    const { id, name, managerIds } = data;

    const dept = await prisma.$transaction(async (tx) => {
      const updatedDept = await tx.department.update({
        where: { id },
        data: {
          name,
          ...(managerIds && {
            managerIds: {
              set: [], // clear old managers before connecting new ones
              connect: managerIds.map((id) => ({ id })),
            },
          }),
        },
      });

      if (managerIds && managerIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: managerIds } },
          data: {
            role: "DEPT_MANAGER",
            departmentId: updatedDept.id,
          },
        });
      }

      return updatedDept;
    });

    return dept;
  }

  async get(data: GetDeptInput) {
    const dept = await prisma.department.findUnique({
      where: { id: data.id },
      include: {
        users: true,
        // Limit to key fields only — avoids fetching thousands of rows for large departments
        projects: {
          select: { id: true, name: true, status: true, stage: true },
        },
        tasks: {
          select: { id: true, name: true, status: true },
        },
        teams: true,
        managerIds: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return dept;
  }

  async getAll() {
    const depts = await prisma.department.findMany({
      include: {
        managerIds: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return depts;
  }

  async delete(data: DeleteDeptInput) {
    const dept = await prisma.department.update({
      where: { id: data.id },
      data: { isDeleted: true },
    });

    return dept;
  }

  async findByName(data: string) {
    const dept = await prisma.department.findUnique({
      where: { name: data },
    });

    return dept;
  }
}