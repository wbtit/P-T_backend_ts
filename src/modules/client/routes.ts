import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import z from "zod";

import { ClientController } from "./controllers";
import { createUserSchema } from "../user/dtos";
import { UpdateUserSchema } from "../user/dtos";

const clientCtrlr = new ClientController();
const router = Router();

// -----------------------------------------------------------------------------
// 🔹 Create Client
// -----------------------------------------------------------------------------
router.post(
  "/:fabricatorId",
  authMiddleware,
  validate({
    body: createUserSchema,
    params: z.object({
      fabricatorId: z.string(),
    }),
  }),
  asyncHandler(clientCtrlr.handleCreateClient.bind(clientCtrlr))
);

// -----------------------------------------------------------------------------
// 🔹 Update Client
// -----------------------------------------------------------------------------
router.put(
  "/:userId",
  authMiddleware,
  validate({
    body: UpdateUserSchema,
    params: z.object({
      userId: z.string(),
    }),
  }),
  asyncHandler(clientCtrlr.handleUpdateClient.bind(clientCtrlr))
);

// -----------------------------------------------------------------------------
// 🔹 Delete Client
// -----------------------------------------------------------------------------
router.delete(
  "/:userId",
  authMiddleware,
  validate({
    params: z.object({
      userId: z.string(),
    }),
  }),
  asyncHandler(clientCtrlr.handleDeleteClient.bind(clientCtrlr))
);

// -----------------------------------------------------------------------------
// 🔹 Get All Clients-- not being used
// -----------------------------------------------------------------------------
router.get(
  "/",
  authMiddleware,
  asyncHandler(clientCtrlr.handleGetAllClients.bind(clientCtrlr))
);

// -----------------------------------------------------------------------------
// 🔹 Get Client by ID
// -----------------------------------------------------------------------------
router.get(
  "/:userId",
  authMiddleware,
  validate({
    params: z.object({
      userId: z.string(),
    }),
  }),
  asyncHandler(clientCtrlr.handleGetClientById.bind(clientCtrlr))
);

router.get(
  "/byFabricator/:fabricatorId",
  authMiddleware,
  validate({
    params: z.object({
      fabricatorId: z.string(),
    }),
  }),
  asyncHandler(clientCtrlr.handleGetClientByFabricatorId.bind(clientCtrlr))
);
export default router;
