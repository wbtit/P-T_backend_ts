import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";

import { InvoiceController, AccountController } from "./controller";
import { createInvoiceSchema, updateInvoiceSchema, createAccountInfoSchema, updateAccountInfoSchema } from "./dtos";

const invoiceCtrlr = new InvoiceController();
const accountCtrlr = new AccountController();
const           router = Router();

// -----------------------------------------------------------------------------
//  invoicing routes
// -----------------------------------------------------------------------------
router.post(
  "/create",
  authMiddleware,
  validate({
    body: createInvoiceSchema,
  }),
  asyncHandler(invoiceCtrlr.handleCreateInvoice.bind(invoiceCtrlr))
);

router.get("/AllInvoices", authMiddleware, asyncHandler(invoiceCtrlr.handleGetAllInvoices.bind(invoiceCtrlr)));
router.get(
  "/client/:clientId",
  authMiddleware,
  validate({
    params: z.object({
      clientId: z.string(),
    }),
  }),
  asyncHandler(invoiceCtrlr.handleGetInvoicesByClientId.bind(invoiceCtrlr))
);

router.put(
  "/:id",
  authMiddleware,
  validate({
    body: updateInvoiceSchema,
    params: z.object({
      id: z.string(),
    }),
  }),
  asyncHandler(invoiceCtrlr.handleUpdateInvoice.bind(invoiceCtrlr))
);

router.delete(
  "/:id",
  authMiddleware,
  validate({
    params: z.object({ id: z.string() }),
  }),
  asyncHandler(invoiceCtrlr.handleDeleteInvoice.bind(invoiceCtrlr))
);

router.get(
  "/pending/fabricator",
  authMiddleware,
  asyncHandler(invoiceCtrlr.handlePendingInvoicesByFabricator.bind(invoiceCtrlr))
);

// -----------------------------------------------------------------------------
// Account Info routes
// -----------------------------------------------------------------------------
router.post(
  "/account",
  authMiddleware,
  validate({
    body: createAccountInfoSchema,
  }),
  asyncHandler(accountCtrlr.handleCreateAccountInfo.bind(accountCtrlr))
);

router.get("/accounts/all", authMiddleware, asyncHandler(accountCtrlr.handleGetAllAccountInfo.bind(accountCtrlr)));

router.get(
  "/account/:id",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string(),
    }),
  }),
  asyncHandler(accountCtrlr.handleGetAccountInfoById.bind(accountCtrlr))
);

router.put(
  "/account/:id",
  authMiddleware,
  validate({
    body: updateAccountInfoSchema,
    params: z.object({
      id: z.string(),
    }),
  }),
  asyncHandler(accountCtrlr.handleUpdateAccountInfo.bind(accountCtrlr))
);

router.delete(
  "/account/:id",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string(),
    }),
  }),
  asyncHandler(accountCtrlr.handleDeleteAccountInfo.bind(accountCtrlr))
);

// -----------------------------------------------------------------------------
// More invoicing routes
// -----------------------------------------------------------------------------
router.get(
  "/byId/:id",
  authMiddleware,
  validate({
    params: z.object({
      id: z.string(),
    }),
  }),
  asyncHandler(invoiceCtrlr.handleGetInvoiceById.bind(invoiceCtrlr))
);

export default router;
