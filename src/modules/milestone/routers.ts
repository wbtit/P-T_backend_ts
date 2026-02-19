import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import {
    createMileStoneSchema,
    createMileStoneResponseSchema,
    updateMileStoneResponseStatusSchema,
    updateMileStoneSchema
} from "./dtos";
import { mileStoneResponseUploads } from "../../utils/multerUploader.util";
import z from "zod"
import { MileStoneController, MileStoneResponseController } from "./controllers";
import {Router} from "express"

const router=Router();
const mileStoneCtrlr= new MileStoneController();
const mileStoneResCtrlr = new MileStoneResponseController();

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
router.put(
    "/existing/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:updateMileStoneSchema}),
    mileStoneCtrlr.handleUpdateExisting.bind(mileStoneCtrlr)
)
router.put(
    "/completion/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    mileStoneCtrlr.handleUpdateCompletion.bind(mileStoneCtrlr)
)
router.get("/",
    authMiddleware,
    mileStoneCtrlr.handleGetAll.bind(mileStoneCtrlr)
)
router.get("/pendingSubmittals", authMiddleware, mileStoneCtrlr.handleGetPendingSubmittals.bind(mileStoneCtrlr))

router.get("/pendingSubmittals/clientAdmin", authMiddleware, mileStoneCtrlr.handleGetPendingSubmittalsByFabricator.bind(mileStoneCtrlr))

router.get("/pendingSubmittals/projectManager", authMiddleware, mileStoneCtrlr.handleGetPendingSubmittalsProjectManager.bind(mileStoneCtrlr))

router.get("/pendingSubmittals/client",authMiddleware,mileStoneCtrlr.handleGetPendingSubmittalsByClient.bind(mileStoneCtrlr))

router.post(
    "/responses",
    authMiddleware,
    mileStoneResponseUploads.array("files"),
    validate({ body: createMileStoneResponseSchema }),
    mileStoneResCtrlr.handleCreateResponse.bind(mileStoneResCtrlr)
)

router.patch(
    "/responses/:parentResponseId/status",
    authMiddleware,
    validate({
        params: z.object({ parentResponseId: z.string() }),
        body: updateMileStoneResponseStatusSchema,
    }),
    mileStoneResCtrlr.handleUpdateStatus.bind(mileStoneResCtrlr)
)

router.get(
    "/responses/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    mileStoneResCtrlr.handleGetResponseById.bind(mileStoneResCtrlr)
)

router.get(
    "/response/:responseId/viewFile/:fileId",
    authMiddleware,
    validate({
        params: z.object({
            responseId: z.string(),
            fileId: z.string(),
        }),
    }),
    mileStoneResCtrlr.handleViewFile.bind(mileStoneResCtrlr)
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
