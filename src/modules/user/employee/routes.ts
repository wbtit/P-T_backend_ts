import { Router } from "express"
import { EmployeeController } from "./controllers"
import validate from "../../../middleware/validate"
import { asyncHandler } from "../../../config/utils/asyncHandler";
import authMiddleware from "../../../middleware/authMiddleware";
import roleMiddleware from "../../../middleware/roleMiddleware";
import { createUserSchema, UpdateUserSchema, FetchUserSchema } from "../dtos";
import z from "zod";

const empCtrl = new EmployeeController();
const router = Router();
router.use(authMiddleware, roleMiddleware(
  ["ADMIN","HUMAN_RESOURCE","CLIENT_ADMIN","PROJECT_MANAGER","TEAM_LEAD","STAFF"
    ,"DEPT_MANAGER","ESTIMATION_HEAD","DEPUTY_MANAGER","OPERATION_EXECUTIVE"
  ]));

// Create employee
router.post(
  "/",
  validate({body:createUserSchema}),
  asyncHandler(empCtrl.handleCreateEmp.bind(empCtrl))
);

// Update employee profile
router.put(
  "/update/:id",
  validate({body:UpdateUserSchema}),
  asyncHandler(empCtrl.handleUpdateProfile.bind(empCtrl))
);

// Fetch employees (with filters from query)
router.get(
  "/",
  asyncHandler(empCtrl.handleGetAllEmployees.bind(empCtrl))
);

// Fetch employees by role
router.get(
  "/role/:role",
  validate({params: z.object({ role: z.string() })}),
  asyncHandler(empCtrl.handleGetEmployeesByRole.bind(empCtrl))
);

// Fetch employee by ID
router.get(
  "/:id",
  validate({params:z.object({id:z.string()})}),
  asyncHandler(empCtrl.handleGetEmployeeById.bind(empCtrl))
);

// Delete employee
router.delete(
  "/id/:id",
  validate({params:z.object({id:z.string()})}),
  asyncHandler(empCtrl.handleDeletEmployee.bind(empCtrl))
);

export default router;
