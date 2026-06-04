import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { CommentService } from "../services";
import { Request, Response } from "express";

const commentsService = new CommentService();

export class CommentController {
    async handleCreateComment(req: AuthenticateRequest, res: Response) {
        const data = req.body;
        const user = req.user;

        if (!user) {
            throw new AppError("User Id is missing", 400);
        }

        const result = await commentsService.create(data, user.id);

        return res.status(201).json({
            message: "Comment created successfully",
            success: true,
            data: result,
        });
    }

    async handleAcknowledge(req: Request, res: Response) {
        const { id } = req.params;
        const result = await commentsService.update(id);

        if (!result) {
            throw new AppError("Failed to acknowledge the comment", 400);
        }

        return res.status(200).json({
            message: "Comment acknowledged successfully",
            success: true,
            data: result,
        });
    }

    async handleGetByTask(req: Request, res: Response) {
        const { id } = req.params;
        const result = await commentsService.findByTask(id);

        if (!result) {
            throw new AppError("Failed to fetch by TaskId", 500);
        }

        if (result.length === 0) {
            return res.status(200).json({
                message: "No comments for the task",
                success: true,
                data: [],
            });
        }

        return res.status(200).json({
            message: "Comments fetched successfully",
            success: true,
            data: result,
        });
    }

    async handleGetByUserId(req: AuthenticateRequest, res: Response) {
        const user = req.user;

        if (!user) {
            throw new AppError("Failed to fetch the userId", 400);
        }

        const result = await commentsService.findByUserId(user.id);

        if (result.length === 0) {
            return res.status(200).json({
                message: "No comments by the user",
                success: true,
                data: [],
            });
        }

        return res.status(200).json({
            message: "User comments fetched successfully",
            success: true,
            data: result,
        });
    }

    // Step 4 - Handler 1: handleGetUnreadForUser
    async handleGetUnreadForUser(req: AuthenticateRequest, res: Response) {
        const user = req.user;
        if (!user) {
            throw new AppError("Unauthorized", 401);
        }

        const result = await commentsService.getUnreadCommentsForUser(user.id);

        return res.status(200).json({
            success: true,
            message: "Unread comments for user fetched successfully",
            data: result,
        });
    }

    // Step 4 - Handler 2: handleGetUnreadForManager
    async handleGetUnreadForManager(req: AuthenticateRequest, res: Response) {
        const user = req.user;
        if (!user) {
            throw new AppError("Unauthorized", 401);
        }

        const result = await commentsService.getUnreadCommentsForManager(user.id);

        return res.status(200).json({
            success: true,
            message: "Unread comments for manager fetched successfully",
            data: result,
        });
    }

    // Step 4 - Handler 3: handleMarkAsRead
    async handleMarkAsRead(req: AuthenticateRequest, res: Response) {
        const user = req.user;
        if (!user) {
            throw new AppError("Unauthorized", 401);
        }

        const { commentIds } = req.body;
        const result = await commentsService.markCommentsAsRead(user.id, commentIds);

        return res.status(200).json({
            success: true,
            message: "Comments marked as read successfully",
            data: result,
        });
    }
}
