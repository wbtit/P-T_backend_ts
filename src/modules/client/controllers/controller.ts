import { Request, Response } from "express";
import { AppError } from "../../../config/utils/AppError";
import { AuthenticateRequest } from "../../../middleware/authMiddleware";
import { ClientService } from "../services/service";

const clientService = new ClientService();

export class ClientController {
    /**
     * Create a new client under a specific fabricator
     */
    async handleCreateClient(req: AuthenticateRequest, res: Response) {
        const { fabricatorId } = req.params;
        const data = req.body;

        if (!fabricatorId) {
            throw new AppError("Fabricator ID is missing", 400);
        }

        const client = await clientService.createClient(data, fabricatorId);

        return res.status(201).json({
            message: "Client created successfully",
            success: true,
            data: client,
        });
    }

    /**
     * Update existing client
     */
    async handleUpdateClient(req: Request, res: Response) {
        const { userId } = req.params;
        const data = req.body;

        if (!userId) {
            throw new AppError("User ID is missing", 400);
        }

        const updatedClient = await clientService.updateClient(userId, data);

        return res.status(200).json({
            message: "Client updated successfully",
            success: true,
            data: updatedClient,
        });
    }

    /**
     * Delete a client by userId
     */
    async handleDeleteClient(req: Request, res: Response) {
        const { userId } = req.params;

        if (!userId) {
            throw new AppError("User ID is missing", 400);
        }

        const deleted = await clientService.deleteClient(userId);

        return res.status(200).json({
            message: "Client deleted successfully",
            success: true,
            data: deleted,
        });
    }

    /**
     * Fetch all clients
     */
    async handleGetAllClients(_req: Request, res: Response) {
        const clients = await clientService.getAllClients();

        if (clients.length === 0) {
            return res.status(200).json({
                message: "No clients found",
                success: true,
                data: [],
            });
        }

        return res.status(200).json({
            message: "Clients fetched successfully",
            success: true,
            data: clients,
        });
    }

    /**
     * Get a client by userId
     */
    async handleGetClientById(req: Request, res: Response) {
        const { userId } = req.params;

        if (!userId) {
            throw new AppError("User ID is missing", 400);
        }

        const client = await clientService.getClientById(userId);

        if (!client) {
            throw new AppError("Client not found", 404);
        }

        return res.status(200).json({
            message: "Client fetched successfully",
            success: true,
            data: client,
        });
    }
}
