import authMiddleware from "../../../middleware/authMiddleware";
import validate from "../../../middleware/validate";
import { Router } from "express";
import { LineItemsController } from "./controllers";
import { asyncHandler } from "../../../config/utils/asyncHandler";
import z from "zod";

const lineItemCtrlr = new LineItemsController();
const router = Router();

router.post("/",
    authMiddleware,
    asyncHandler(lineItemCtrlr.handleCreateLineItemGroup).bind(LineItemsController)
);
router.put("/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleUpdateLineItemGroup).bind(LineItemsController)
);
router.get("/groups/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleGetGroupsByEstimationId).bind(LineItemsController)
);
router.get("/group/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleGetGroupById).bind(LineItemsController)
);
router.get("/allGroups",
    authMiddleware,
    asyncHandler(lineItemCtrlr.handleGetAllGroups).bind(LineItemsController)
);
router.delete("/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleDeleteLineItemGroup).bind(LineItemsController)
);

// Line Items
router.post("/item",
    authMiddleware,
    asyncHandler(lineItemCtrlr.handleCreateLineItem).bind(LineItemsController)
);
router.put("/update/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleUpdateLineItem).bind(LineItemsController)
);
router.get("/Bygroup/:groupId",
    authMiddleware,
    validate({ params: z.object({ groupId: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleGetLineItemsGroupById).bind(LineItemsController)
);
router.delete("/item/:id",
    authMiddleware,
    validate({ params: z.object({ id: z.string() }) }),
    asyncHandler(lineItemCtrlr.handleDeleteLineItem).bind(LineItemsController)
);

export default router;