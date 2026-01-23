import { Router } from "express";
import { RFQController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { CreateRfqSchema,UpdateRfqSchema } from "./dtos";

import { RfqResponseSchema} from "./RFQresponse";
import { RfqResponseController } from "./RFQresponse";
import { rfqUploads,rfqResponseUploads } from "../../utils/multerUploader.util";

import z from "zod";

const router = Router();
const rfqController = new RFQController();
const rfqResponseController = new RfqResponseController();

router.post(
    "/",
    authMiddleware,
    rfqUploads.array("files"),
    validate({body: CreateRfqSchema}),
    rfqController.handleCreateRfq.bind(rfqController)
);

router.put(
    "/update/:id",
    authMiddleware,
    rfqUploads.array("files"),
    validate({params:z.object({id:z.string()}),body:UpdateRfqSchema}),
    rfqController.handleUpdateRfq.bind(rfqController)
);

router.get(
    "/getById/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.handleGetRfqById.bind(rfqController)
);
router.get(
    "/all",
    authMiddleware,
    rfqController.handleGetAllRFQ.bind(rfqController)
);

router.get(
    "/sents",
    authMiddleware,
    rfqController.handleSents.bind(rfqController)
);

router.get(
    "/received",
    authMiddleware,
    rfqController.handleReceived.bind(rfqController)
);
router.get(
    "/:rfqId/files/:fileId",
    authMiddleware,
    validate({params:z.object({rfqId:z.string(),fileId:z.string()})}),
    rfqController.handleGetFile.bind(rfqController)
);
router.get(
    "/viewFile/:rfqId/:fileId",
    authMiddleware,
    validate({params:z.object({rfqId:z.string(),fileId:z.string()})}),
    rfqController.handleViewFile.bind(rfqController)
);
router.delete(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.handleCloseRfq.bind(rfqController)
);
router.delete(
    "/delete/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.handleDeleteRFQ.bind(rfqController)
);
router.get(
    "/pendingRFQs",
    authMiddleware,
    rfqController.handlePendingRFQs.bind(rfqController)
)
// ===========================================================
// RFQ RESPONSE ROUTES
// ===========================================================

router.post(
    "/:rfqId/responses",
    authMiddleware,
    rfqResponseUploads.array("files"),
    validate({params:z.object({rfqId:z.string()}),body:RfqResponseSchema}),
    rfqResponseController.handleCreate.bind(rfqResponseController)
);

router.get(
    "/responses/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqResponseController.handleGetById.bind(rfqResponseController)
);

router.get(
    "/responses/:rfqResId/files/:fileId",
    authMiddleware,
    validate({params:z.object({rfqResId:z.string(),fileId:z.string()})}),
    rfqResponseController.handleGetFile.bind(rfqResponseController)
);

router.get(
    "/response/viewFile/:rfqResId/:fileId",
    authMiddleware,
    validate({params:z.object({rfqResId:z.string(),fileId:z.string()})}),
    rfqResponseController.handleViewFile.bind(rfqResponseController)
);

export default router;