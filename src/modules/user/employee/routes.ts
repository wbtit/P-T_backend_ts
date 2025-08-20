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
  validate(createUserSchema),
  asyncHandler(empCtrl.handleCreateEmp)
);

// Update employee profile
router.put(
  "/update",
  authMiddleware,
  validate(UpdateUserSchema),
  asyncHandler(empCtrl.handleUpdateProfile)
);

// Fetch employees (with filters from query)
router.get(
  "/",
  authMiddleware,
  validate(FetchUserSchema),
  asyncHandler(empCtrl.handleGetAllEmployees)
);

// Fetch employees by role
router.get(
  "/role/:role",
  authMiddleware,
  validate(z.object({ params: z.object({ role: z.string()}) })),
  asyncHandler(empCtrl.handleGetEmployeesByRole)
);

// Fetch employee by ID
router.get(
  "/id/:id",
  authMiddleware,
  validate(z.object({ params: z.object({ id: z.string()}) })),
  asyncHandler(empCtrl.handleGetEmployeeById)
);

// Delete employee
router.delete(
  "/id/:id",
  authMiddleware,
  validate(z.object({ params: z.object({ id: z.string()}) })),
  asyncHandler(empCtrl.handleDeletEmployee)
);

export default router;
