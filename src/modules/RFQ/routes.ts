import { Router } from "express";
import { RFQController } from "./controllers";
import validate from "../../middleware/validate";
import authMiddleware from "../../middleware/authMiddleware";
import { CreateRfqSchema } from "./dtos";
import z from "zod";

const router = Router();
const rfqController = new RFQController();

router.post(
    "/",
    authMiddleware,
    validate({body: CreateRfqSchema}),
    rfqController.createRfq.bind(rfqController)
);

router.put(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()}),body:CreateRfqSchema}),
    rfqController.updateRfq.bind(rfqController)
);

router.get(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.getRfqById.bind(rfqController)
);

router.get(
    "/sents",
    authMiddleware,
    rfqController.sents.bind(rfqController)
);

router.get(
    "/received",
    authMiddleware,
    rfqController.received.bind(rfqController)
);

router.delete(
    "/:id",
    authMiddleware,
    validate({params:z.object({id:z.string()})}),
    rfqController.closeRfq.bind(rfqController)
);

export default router;