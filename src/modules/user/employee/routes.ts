import { Router } from "express"
import { EmployeeController } from "./controllers"
import validate from "../../../middleware/validate"
import { asyncHandler } from "../../../config/utils/asyncHandler";
import authMiddleware from "../../../middleware/authMiddleware";
import { createUserSchema, UpdateUserSchema, FetchUserSchema } from "../dtos";
import z from "zod";

const empCtrl = new EmployeeController();
const router = Router();

// Create employee
router.post(
  "/",
  authMiddleware,
  validate({body:createUserSchema}),
  asyncHandler(empCtrl.handleCreateEmp.bind(empCtrl))
);

// Update employee profile
router.put(
  "/update/:id",
  authMiddleware,
  validate({body:UpdateUserSchema}),
  asyncHandler(empCtrl.handleUpdateProfile.bind(empCtrl))
);

// Fetch employees (with filters from query)
router.get(
  "/",
  authMiddleware,
  asyncHandler(empCtrl.handleGetAllEmployees.bind(empCtrl))
);

// Fetch employees by role
router.get(
  "/role/:role",
  authMiddleware,
  validate({params: z.object({ role: z.string() })}),
  asyncHandler(empCtrl.handleGetEmployeesByRole.bind(empCtrl))
);

// Fetch employee by ID
router.get(
  "/:id",
  authMiddleware,
  validate({params:z.object({id:z.string()})}),
  asyncHandler(empCtrl.handleGetEmployeeById.bind(empCtrl))
);

// Delete employee
router.delete(
  "/id/:id",
  authMiddleware,
  validate({params:z.object({id:z.string()})}),
  asyncHandler(empCtrl.handleDeletEmployee.bind(empCtrl))
);

export default router;
