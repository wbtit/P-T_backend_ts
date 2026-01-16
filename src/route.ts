import { Router } from "express";
import { createShareLink,downloadShare } from "./utils/shareLink";

const router = Router();

router.post("/:table/:parentId/:fileId", createShareLink);
router.get("/:token", downloadShare);

export {router as shareLinkRouter};