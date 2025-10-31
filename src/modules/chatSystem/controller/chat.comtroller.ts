import { Request, Response } from "express";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { ChatService } from "../service";

const chatService = new ChatService();

export class ChatController {
  // -------------------------------------------------------------
  // Create a new chat group
  // -------------------------------------------------------------
  async handleCreateGroup(req: AuthenticateRequest, res: Response) {
    const { name } = req.body;
    const user = req.user;

    if (!user) throw new AppError("User not authenticated", 401);
    if (!name) throw new AppError("Group name is required", 400);

    const group = await chatService.createGroup(name, user.id);

    return res.status(201).json({
      message: "Group created successfully",
      success: true,
      data: group,
    });
  }

  // -------------------------------------------------------------
  // Add members to a group
  // -------------------------------------------------------------
  async handleAddMembers(req: Request, res: Response) {
    const { memberIds, groupId } = req.body;

    if (!groupId) throw new AppError("Group ID is required", 400);
    if (!Array.isArray(memberIds) || memberIds.length === 0)
      throw new AppError("Member IDs are required", 400);

    const result = await chatService.addMemberToGroup(memberIds, groupId);

    return res.status(200).json({
      message: "Members added successfully",
      success: true,
      data: result,
    });
  }

  // -------------------------------------------------------------
  // Fetch group chat history
  // -------------------------------------------------------------
  async handleGroupChatHistory(req: Request, res: Response) {
    const { groupId, lastMessageId } = req.params;

    if (!groupId) throw new AppError("Group ID is required", 400);

    const result = await chatService.groupChatHistory(groupId, lastMessageId || "");

    return res.status(200).json({
      message: "Group chat history fetched successfully",
      success: true,
      data: result,
    });
  }

  // -------------------------------------------------------------
  // Fetch private chat history
  // -------------------------------------------------------------
  async handlePrivateChatHistory(req: AuthenticateRequest, res: Response) {
    const { userId } = req.params;
    const { lastMessageId } = req.query;
    const authUser = req.user;

    if (!authUser) throw new AppError("User not authenticated", 401);
    if (!userId) throw new AppError("Target user ID is required", 400);

    const result = await chatService.privateChatHistory(
      authUser.id,
      userId,
      lastMessageId as string,
      "20"
    );

    return res.status(200).json({
      message: "Private chat history fetched successfully",
      success: true,
      data: result,
    });
  }

  // -------------------------------------------------------------
  // Fetch recent chats (sidebar)
  // -------------------------------------------------------------
  async handleRecentChats(req: AuthenticateRequest, res: Response) {
    const user = req.user;

    if (!user) throw new AppError("User not authenticated", 401);

    const result = await chatService.recentChats(user.id);

    return res.status(200).json({
      message: "Recent chats fetched successfully",
      success: true,
      data: result,
    });
  }

  // -------------------------------------------------------------
  // Remove a member from a group
  // -------------------------------------------------------------
  async handleDeleteGroupMember(req: Request, res: Response) {
    const { groupId, memberId } = req.params;

    if (!groupId || !memberId)
      throw new AppError("Group ID and Member ID are required", 400);

    await chatService.deleteMembersInGroup(groupId, memberId);

    return res.status(200).json({
      message: "Member removed from group successfully",
      success: true,
    });
  }

  // -------------------------------------------------------------
  // Get all members of a group
  // -------------------------------------------------------------
  async handleGetGroupMembers(req: Request, res: Response) {
    const { groupId } = req.params;

    if (!groupId) throw new AppError("Group ID is required", 400);

    const members = await chatService.getGroupMembers(groupId);

    return res.status(200).json({
      message: "Group members fetched successfully",
      success: true,
      data: members,
    });
  }

  // -------------------------------------------------------------
  // Delete a group
  // -------------------------------------------------------------
  async handleDeleteGroup(req: Request, res: Response) {
    const { groupId } = req.params;

    if (!groupId) throw new AppError("Group ID is required", 400);

    const result = await chatService.deleteGroup(groupId);

    return res.status(200).json({
      message: "Group deleted successfully",
      success: true,
      data: result,
    });
  }
}
