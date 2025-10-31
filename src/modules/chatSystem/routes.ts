import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware";
import validate from "../../middleware/validate";
import { asyncHandler } from "../../config/utils/asyncHandler";
import { ChatController } from "./controller";
import z from "zod";

const chatCtrlr = new ChatController();
const router = Router();

// -------------------------------------------------------------
// Create Group
// -------------------------------------------------------------
router.post(
  "/group",
  authMiddleware,
  validate({ body: z.object({ name: z.string().min(1, "Group name is required") }) }),
  asyncHandler(chatCtrlr.handleCreateGroup).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Add Members to Group
// -------------------------------------------------------------
router.post(
  "/group/members",
  authMiddleware,
  validate({
    body: z.object({
      groupId: z.string().uuid("Invalid group ID"),
      memberIds: z.array(z.string().uuid("Invalid member ID")).min(1, "At least one member required"),
    }),
  }),
  asyncHandler(chatCtrlr.handleAddMembers).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Get Group Chat History
// -------------------------------------------------------------
router.get(
  "/group/:groupId/history/:lastMessageId?",
  authMiddleware,
  validate({
    params: z.object({
      groupId: z.string().uuid("Invalid group ID"),
      lastMessageId: z.string().optional(),
    }),
  }),
  asyncHandler(chatCtrlr.handleGroupChatHistory).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Get Private Chat History
// -------------------------------------------------------------
router.get(
  "/private/:userId",
  authMiddleware,
  validate({
    params: z.object({ userId: z.string().uuid("Invalid user ID") }),
    query: z.object({ lastMessageId: z.string().optional() }),
  }),
  asyncHandler(chatCtrlr.handlePrivateChatHistory).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Get Recent Chats (Sidebar)
// -------------------------------------------------------------
router.get(
  "/recent",
  authMiddleware,
  asyncHandler(chatCtrlr.handleRecentChats).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Remove Member from Group
// -------------------------------------------------------------
router.delete(
  "/group/:groupId/member/:memberId",
  authMiddleware,
  validate({
    params: z.object({
      groupId: z.string().uuid("Invalid group ID"),
      memberId: z.string().uuid("Invalid member ID"),
    }),
  }),
  asyncHandler(chatCtrlr.handleDeleteGroupMember).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Get All Members of a Group
// -------------------------------------------------------------
router.get(
  "/group/:groupId/members",
  authMiddleware,
  validate({ params: z.object({ groupId: z.string().uuid("Invalid group ID") }) }),
  asyncHandler(chatCtrlr.handleGetGroupMembers).bind(chatCtrlr)
);

// -------------------------------------------------------------
// Delete Group
// -------------------------------------------------------------
router.delete(
  "/group/:groupId",
  authMiddleware,
  validate({ params: z.object({ groupId: z.string().uuid("Invalid group ID") }) }),
  asyncHandler(chatCtrlr.handleDeleteGroup).bind(chatCtrlr)
);

export default router;
