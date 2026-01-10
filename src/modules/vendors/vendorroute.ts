import { Router } from "express";
import z from "zod";

import { VendorController } from "./controller";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import authMiddleware from "../../middleware/authMiddleware";

import {
  vendorUploads,
  vendorCertificatesUploads,
} from "../../utils/multerUploader.util";

import {
  VendorSchema,
  updateVendorSchema,
} from "./dto";

const router = Router();
const vendorCtrl = new VendorController();

/**
 * ---------------------------------------------------------------------
 *  CREATE Vendor
 * ---------------------------------------------------------------------
 */
router.post(
  "/",
  authMiddleware,
  vendorUploads.array("files"),
  vendorCertificatesUploads.array("certificates"),
  validate({ body: VendorSchema }),
  asyncHandler(vendorCtrl.handleCreateVendor.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  UPDATE Vendor
 * ---------------------------------------------------------------------
 */
router.put(
  "/update/:id",
  authMiddleware,
  vendorUploads.array("files"),
  vendorCertificatesUploads.array("certificates"),
  validate({
    params: z.object({ id: z.string() }),
    body: updateVendorSchema,
  }),
  asyncHandler(vendorCtrl.handleUpdateVendor.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET ALL Vendors
 * ---------------------------------------------------------------------
 */
router.get(
  "/all",
  authMiddleware,
  asyncHandler(vendorCtrl.handleGetAllVendors.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET Vendor by ID
 * ---------------------------------------------------------------------
 */
router.get(
  "/:id",
  authMiddleware,
  validate({ params: z.object({ id: z.string() }) }),
  asyncHandler(vendorCtrl.handleGetVendorById.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  GET FILE (Meta)
 * ---------------------------------------------------------------------
 */
router.get(
  "/file/:vendorId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      vendorId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(vendorCtrl.handleGetFile.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  VIEW / STREAM FILE
 * ---------------------------------------------------------------------
 */
router.get(
  "/viewFile/:vendorId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      vendorId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(vendorCtrl.handleViewFile.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE FILE FROM Vendor
 * ---------------------------------------------------------------------
 */
router.delete(
  "/files/:vendorId/:fileId",
  authMiddleware,
  validate({
    params: z.object({
      vendorId: z.string(),
      fileId: z.string(),
    }),
  }),
  asyncHandler(vendorCtrl.handleDeleteFile.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE CERTIFICATE FROM Vendor
 * ---------------------------------------------------------------------
 */
router.delete(
  "/certificates/:vendorId/:certificateId",
  authMiddleware,
  validate({
    params: z.object({
      vendorId: z.string(),
      certificateId: z.string(),
    }),
  }),
  asyncHandler(vendorCtrl.handleDeleteCertificate.bind(vendorCtrl))
);

/**
 * ---------------------------------------------------------------------
 *  DELETE Vendor
 * ---------------------------------------------------------------------
 */
router.delete(
  "/id/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(vendorCtrl.handleDeleteVendor.bind(vendorCtrl))
);

export default router;
