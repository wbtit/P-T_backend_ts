import { AppError } from "../../../config/utils/AppError";
import { CreateDeptInput, DeleteDeptInput, FindByNameInput, GetDeptInput, UpdateDeptInput } from "../dtos";
import { DeptRepository } from "../repositories";

const deptRepo = new DeptRepository();

export class DeptService {
    async create(data: CreateDeptInput) {
        const dept = await deptRepo.create(data);
        return {dept};
    }

    async update(data: UpdateDeptInput) {
        const dept = await deptRepo.update(data);
        return {dept};
    }

    async get(data: GetDeptInput) {
        const dept = await deptRepo.get(data);
        return {dept};
    }

    async getAll() {
        const depts = await deptRepo.getAll();
        return {depts};
    }

    async delete(data: DeleteDeptInput) {
        const dept = await deptRepo.delete(data);
        return {dept};
    }
    async findByName(data: FindByNameInput) {
        const dept = await deptRepo.findByName(data);
        return {dept};
    }
}
