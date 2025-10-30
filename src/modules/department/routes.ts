import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import { DeptController } from "./controllers";
import validate from "../../middleware/validate";
import { Router } from "express";
import { createDeptZod } from "./dtos";
import z from "zod";

const deptController = new DeptController();
const router = Router();

router.post("/",
    authMiddleware,
    validate({ body: createDeptZod }),
    asyncHandler(deptController.handleCreateDept.bind(deptController)));

router.put("/update/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}) , body: createDeptZod}),
    asyncHandler(deptController.handleUpdateDept.bind(deptController))
)
router.get("/department/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(deptController.handleGetDept.bind(deptController))
)
router.get("/",
    authMiddleware,
    asyncHandler(deptController.handleGetAllDepts.bind(deptController))
);
router.delete("/delete/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(deptController.handleDeleteDept.bind(deptController))
);

export default router;