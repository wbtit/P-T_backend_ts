import Router from "express";
import authMiddleware from "../../../../middleware/authMiddleware";
import roleMiddleware from "../../../../middleware/roleMiddleware";
import validate from "../../../../middleware/validate";
import { CreateWbsLineItemTemplateDto, UpdateWbsLineItemTemplateDto } from "./dtos/wbsLineItemTemplates.dto";
import z from "zod";
import { asyncHandler } from "../../../../config/utils/asyncHandler";
import { WbsLineItemTemplateController } from "./controller/wbsLineItemTemplate.controller";
import { CreateWbsTemplateDto, UpdateWbsTemplateDto } from "./dtos/wbsTemplate.dto";
import { WbsBundleTemplateController } from "./controller/wbsBundleTemplate.controller";
import { WbsTemplateController } from "./controller/wbsTemplate.controller";
import { CreateWbsBundleTemplateDto, UpdateWbsBundleTemplateDto } from "./dtos/wbsBundle.dto";

const router = Router();
const lineItemcontroller = new WbsLineItemTemplateController();
const bundleController = new WbsBundleTemplateController();
const wbscontroller = new WbsTemplateController();


router.post(
  "/admin/templates/line-items",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({ body: CreateWbsLineItemTemplateDto }),
  asyncHandler(lineItemcontroller.create.bind(lineItemcontroller))
);

router.put(
  "/admin/templates/line-items/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: UpdateWbsLineItemTemplateDto,
  }),
  asyncHandler(lineItemcontroller.update.bind(lineItemcontroller))
);




router.post(
  "/admin/templates/wbs",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({ body: CreateWbsTemplateDto }),
  asyncHandler(wbscontroller.create.bind(wbscontroller))
);

router.put(
  "/admin/templates/wbs/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({
    params: z.object({ id: z.string() }),
    body: UpdateWbsTemplateDto,
  }),
  asyncHandler(wbscontroller.update.bind(wbscontroller))
);



router.get(
  "/admin/templates/bundles",
  authMiddleware,
  roleMiddleware("ADMIN"),
  asyncHandler(bundleController.list.bind(bundleController))
);

router.post(
  "/admin/templates/bundles",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({ body: CreateWbsBundleTemplateDto }),
  asyncHandler(bundleController.create.bind(bundleController))
);

router.put(
  "/admin/templates/bundles/:bundleKey",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validate({
    params: z.object({ bundleKey: z.string() }),
    body: UpdateWbsBundleTemplateDto,
  }),
  asyncHandler(bundleController.update.bind(bundleController))
);


export default router;
