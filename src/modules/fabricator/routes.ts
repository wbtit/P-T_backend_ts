import {Router} from "express";
import { FabricatorController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import {CreateFabricatorSchema,
    UpdateFabricatorSchema,
} from "./dtos"
import z from 'zod'

 const fabCtrl=new FabricatorController();
 const router = Router();

router.post(
    "/",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:CreateFabricatorSchema}),
    asyncHandler(fabCtrl.handleCreateFabricator)
);

router.put(
    "/update/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:UpdateFabricatorSchema}),
    asyncHandler(fabCtrl.handleUpdateFabricator)
)

router.get(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleGetFabricatorById)
)

router.get(
    "/all",
    authMiddleware,
    asyncHandler(fabCtrl.handleGetAllFabricators)
)
router.get(
    "/createdBy/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleGetFabricatorByCreatedById)
)
router.delete(
    "/id/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    asyncHandler(fabCtrl.handleDeleteFabricator)
)

export default router;