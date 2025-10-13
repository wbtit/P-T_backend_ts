import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { createMileStoneSchema,updateMileStoneSchema } from "./dtos";
import z from "zod"
import { MileStoneController } from "./controllers";
import {Router} from "express"

const router=Router();
const mileStoneCtrlr= new MileStoneController();

router.post("/",
    authMiddleware,
    validate({body:createMileStoneSchema}),
    mileStoneCtrlr.handleCreate.bind(MileStoneController)
)
router.put("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateMileStoneSchema}),
    mileStoneCtrlr.handleUpdate.bind(mileStoneCtrlr)
)
router.get("/",
    authMiddleware,
    mileStoneCtrlr.handleGetAll.bind(mileStoneCtrlr)
)
router.get("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    mileStoneCtrlr.handleGetById.bind(mileStoneCtrlr)
)
router.get("/project/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    mileStoneCtrlr.handleGetByProjectId.bind(mileStoneCtrlr)
)
router.delete("/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    mileStoneCtrlr.handleDelete.bind(mileStoneCtrlr)
)
export default router