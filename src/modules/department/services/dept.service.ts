import { AppError } from "../../../config/utils/AppError";
import { CreateDeptInput, DeleteDeptInput, FindByNameInput, GetDeptInput, UpdateDeptInput } from "../dtos";
import { DeptRepository } from "../repositories";

const deptRepo = new DeptRepository();

export class DeptService {
  async create(data: CreateDeptInput, userId: string) {
    const dept = await deptRepo.create(data, userId);
    if (!dept) throw new AppError("Failed to create department", 500);
    return { dept };
  }

  async update(data: UpdateDeptInput) {
    const dept = await deptRepo.update(data);
    if (!dept) throw new AppError("Failed to update department", 500);
    return { dept };
  }

  async get(data: GetDeptInput) {
    const dept = await deptRepo.get(data);
    return { dept };
  }

  async getAll() {
    const depts = await deptRepo.getAll();
    return { depts };
  }

  async delete(data: DeleteDeptInput) {
    const dept = await deptRepo.delete(data);
    if (!dept) throw new AppError("Failed to delete department", 500);
    return { dept };
  }

  async findByName(data: FindByNameInput) {
    const dept = await deptRepo.findByName(data.name);
    return { dept };
  }
}
