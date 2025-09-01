import { Router } from "express";
import { RFQController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { CreateRfqSchema } from "./dtos";

import { RfqResponseSchema} from "./RFQresponse";
import { RfqResponseController } from "./RFQresponse";

import z from "zod";

const router = Router();
const rfqController = new RFQController();
const rfqResponseController = new RfqResponseController();

router.post(
    "/",
    authMiddleware,
    validate({body: CreateRfqSchema}),
    rfqController.handleCreateRfq.bind(rfqController)
);

router.put(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:CreateRfqSchema}),
    rfqController.hanleUpdateRfq.bind(rfqController)
);

router.get(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.handleGetRfqById.bind(rfqController)
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

router.delete(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.handleCloseRfq.bind(rfqController)
);

router.post(
    "/:rfqId/responses",
    authMiddleware,
    validate({params:z.object({rfqId:z.string()}),body:RfqResponseSchema}),
    rfqResponseController.handleCreate.bind(rfqResponseController)
);

router.get(
    "/responses/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqResponseController.handleGetById.bind(rfqResponseController)
);

export default router;