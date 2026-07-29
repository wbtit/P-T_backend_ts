import { Router } from "express";
import { FabricatorController } from "./controllers";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";
import {
  CreateFabricatorSchema,
  UpdateFabricatorSchema,
  FabricatorClientAdminHandoverSchema,
} from "./dtos";
import z from "zod";
import { fabricatorsUploads } from "../../utils/multerUploader.util";
import { scanUploadMiddleware } from "../../middleware/scanUpload.middleware";
import { FabricatorFileController } from "./controllers/fabricatorFile.controller";
import { BranchController } from "./branches";
import { branchSchema } from "./branches";

const fabCtrl = new FabricatorController();
const fabFileCtrl = new FabricatorFileController();
const branchCtrl = new BranchController();
const router = Router();

const allowedRoles = ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "PROJECT_MANAGER_OFFICER","SALES_PERSON","SALES_MANAGER"];
const restrictToAllowedRoles = (req: any, res: any, next: any) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Not allowed: Only ADMIN, DEPUTY_MANAGER, OPERATION_EXECUTIVE, or PROJECT_MANAGER_OFFICER can perform this action."
    });
  }
  next();
};

router.post(
  "/",
  authMiddleware,
  restrictToAllowedRoles,
  fabricatorsUploads.array("files"),
  scanUploadMiddleware,
  validate({ body: CreateFabricatorSchema }),
  asyncHandler(fabCtrl.handleCreateFabricator.bind(fabCtrl))
);

router.put(
  "/update/:id",
  authMiddleware,
  restrictToAllowedRoles,
  fabricatorsUploads.array("files"),
  scanUploadMiddleware,
  validate({ params: z.object({ id: z.uuid() }), body: UpdateFabricatorSchema }),
  asyncHandler(fabCtrl.handleUpdateFabricator.bind(fabCtrl))
);

router.post(
  "/handover-client-admin",
  authMiddleware,
  validate({ body: FabricatorClientAdminHandoverSchema }),
  asyncHandler(fabCtrl.handleHandoverClientAdmin.bind(fabCtrl))
);

router.get(
  "/all",
  authMiddleware,
  asyncHandler(fabCtrl.handleGetAllFabricators.bind(fabCtrl))
);


// router.get(
//   "/createdBy",
//   authMiddleware,
//   asyncHandler(fabCtrl.handleGetFabricatorByCreatedById.bind(fabCtrl))
// );

router.get(
  "/file/:fabricatorId/:fileId",
  authMiddleware,
  validate({ params: z.object({ fabricatorId: z.uuid(), fileId: z.string() }) }),
  asyncHandler(fabFileCtrl.handleGetFile.bind(fabFileCtrl))
);

router.get(
  "/viewFile/:fabricatorId/:fileId",
  authMiddleware,
  validate({ params: z.object({ fabricatorId: z.uuid(), fileId: z.string() }) }),
  asyncHandler(fabFileCtrl.handleViewFile.bind(fabFileCtrl))
);

router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.uuid() }) }),
  asyncHandler(fabCtrl.handleGetFabricatorById.bind(fabCtrl))
);

router.delete(
  "/id/:id",
  authMiddleware,
  restrictToAllowedRoles,
  validate({ params: z.object({ id: z.uuid() }) }),
  asyncHandler(fabCtrl.handleDeleteFabricator.bind(fabCtrl))
);

router.delete(
  "/files/:fabricatorId/:fileId",
  authMiddleware,
   restrictToAllowedRoles,
  validate({ params: z.object({ fabricatorId: z.uuid(), fileId: z.string() }) }),
  asyncHandler(fabFileCtrl.handleDeleteFile.bind(fabFileCtrl))
);

router.post(
  "/branch",
  authMiddleware,
  restrictToAllowedRoles,
  validate({ body: branchSchema }),
  asyncHandler(branchCtrl.createBranch.bind(branchCtrl))
);

router.put(
  "/branch/:id",
  authMiddleware,
  restrictToAllowedRoles,
  validate({ params: z.object({ id: z.uuid() }), body: branchSchema }),
  asyncHandler(branchCtrl.updateBranch.bind(branchCtrl))
);

router.delete(
  "/branch/:id",
  authMiddleware,
  restrictToAllowedRoles,
  validate({ params: z.object({ id: z.uuid() }) }),
  asyncHandler(branchCtrl.deleteBranch.bind(branchCtrl))
);

router.get(
  "/branch/:id",
  authMiddleware,
   restrictToAllowedRoles,
  validate({ params: z.object({ id: z.uuid() }) }),
  asyncHandler(branchCtrl.getBranchById.bind(branchCtrl))
);

router.get(
  "/branch/fabricator/:fabricatorId",
  authMiddleware,
   restrictToAllowedRoles,
  validate({ params: z.object({ fabricatorId: z.uuid() }) }),
  asyncHandler(branchCtrl.getBranchesByFabricatorId.bind(branchCtrl))
);

export default router;
