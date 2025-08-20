import { AppError } from "../../../../config/utils/AppError";
import { userRole } from "../../dtos";
import { UserService } from "../../services";
import { EmployeRepository } from "../repositories/repository";

export class EmployeeServices extends UserService{
    emprepo= new EmployeRepository()

   async allEmployees(){
    const employees = await this.emprepo.getAllEmployee();
    if (!employees) throw new AppError("Failed to fetch employees", 500);
    if (employees.length === 0) throw new AppError("There are no employees", 404);
    return { employees };

   }

   async employeeByRole(role: userRole) {
    const employees = await this.emprepo.getAllEmployesByRole(role);
    if (!employees) throw new AppError("Failed to fetch employees", 500);
    if (employees.length === 0) throw new AppError("No employees with this role", 404);
    return { employees };
  }
}