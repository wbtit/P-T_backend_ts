import Router from "express";
import authMiddleware from "../../../../middleware/authMiddleware";
import roleMiddleware from "../../../../middleware/roleMiddleware";
import validate from "../../../../middleware/validate";
import { CreateWbsLineItemTemplateDto, UpdateWbsLineItemTemplateDto } from "./dtos/wbsLineItemTemplates.dto";
import z from "zod";
import { asyncHandler } from "../../../../config/utils/asyncHandler";
import { WbsLineItemTemplateController } from "./controller/wbsLineItemTemplate.controller";
import { CreateWbsTemplateDto, UpdateWbsTemplateDto } from "./dtos/wbsTemplate.dto";

const router = Router();
const controller = new WbsLineItemTemplateController();

router.post(
  "/admin/templates/line-items",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({ body: CreateWbsLineItemTemplateDto }),
  asyncHandler(controller.create.bind(controller))
);

router.put(
  "/admin/templates/line-items/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateWbsLineItemTemplateDto,
  }),
  asyncHandler(controller.update.bind(controller))
);
router.post(
  "/admin/templates/wbs",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({ body: CreateWbsTemplateDto }),
  asyncHandler(controller.create.bind(controller))
);

router.put(
  "/admin/templates/wbs/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateWbsTemplateDto,
  }),
  asyncHandler(controller.update.bind(controller))
);

export default router;
