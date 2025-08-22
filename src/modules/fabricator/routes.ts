import {Router} from "express";
import { FabricatorController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import {CreateFabricatorSchema,
    UpdateFabricatorSchema,
} from "./dtos"
import z from 'zod'
import { fabricatorsUploads } from "../../utils/multerUploader.util";

 const fabCtrl=new FabricatorController();
 const router = Router();

router.post(
    "/:",
    authMiddleware,
    validate({body:CreateFabricatorSchema}),
    fabricatorsUploads.array("files"),
    asyncHandler(fabCtrl.handleCreateFabricator)
);

router.put(
    "/update/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:UpdateFabricatorSchema}),
     fabricatorsUploads.array("files"),
    asyncHandler(fabCtrl.handleUpdateFabricator.bind(fabCtrl))
)

router.get(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleGetFabricatorById.bind(fabCtrl))
)

router.get(
    "/all",
    authMiddleware,
    asyncHandler(fabCtrl.handleGetAllFabricators.bind(fabCtrl))
)
router.get(
    "/createdBy/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleGetFabricatorByCreatedById.bind(fabCtrl))
)
router.delete(
    "/id/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleDeleteFabricator.bind(fabCtrl))
)

export default router;