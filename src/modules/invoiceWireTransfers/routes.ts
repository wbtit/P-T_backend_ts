import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import z from "zod";

import { InvoiceWireTransferController } from "./controllers";
import {
  CreateInvoiceWireTransferSchema,
  UpdateInvoiceWireTransferSchema,
} from "./dtos";

const ctrlr = new InvoiceWireTransferController();
const router = Router();

router.post(
  "/create",
  authMiddleware,
  validate({
    body: CreateInvoiceWireTransferSchema,
  }),
  ctrlr.handleCreate
);

router.get(
  "/all",
  authMiddleware,
  ctrlr.handleGetAll
);

router.get(
  "/byInvoiceId/:invoiceId",
  authMiddleware,
  validate({
    params: z.object({ invoiceId: z.string() }),
  }),
  ctrlr.handleGetByInvoiceId
);

router.get(
  "/my-transfers",
  authMiddleware,
  ctrlr.handleGetMyTransfers
);

router.get(
  "/byId/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  ctrlr.handleGetById
);

router.put(
  "/:id",
  authMiddleware,
  validate({
    body: UpdateInvoiceWireTransferSchema,
    params: z.object({ id: z.string()}),
  }),
  ctrlr.handleUpdate
);

router.delete(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string()}),
  }),
  ctrlr.handleDelete
);

export default router;
