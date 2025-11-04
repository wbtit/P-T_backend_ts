import { Request, Response } from "express";
import { AccountService } from "../services";
import { AppError } from "../../../config/utils/AppError";

const accountService = new AccountService();

export class AccountController {
  // ---------------------------------------------------------------------------
  // Create Account Info
  // ---------------------------------------------------------------------------
  async handleCreateAccountInfo(req: Request, res: Response) {
    try {
      const { id: invoiceId } = req.params; // from route: /invoice/:id/account
      const data = req.body;

      if (!invoiceId) {
        throw new AppError("Invoice ID is required", 400);
      }

      const result = await accountService.createAccountInfo(data, invoiceId);

      return res.status(201).json({
        message: "Account info created successfully",
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("❌ Create Account Info Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Internal server error",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update Account Info
  // ---------------------------------------------------------------------------
  async handleUpdateAccountInfo(req: Request, res: Response) {
    try {
      const { id } = req.params; // account id
      const data = req.body;

      if (!id) {
        throw new AppError("Account ID is required", 400);
      }

      const updatedAccount = await accountService.updateAccountInfo(id, data);

      return res.status(200).json({
        message: "Account info updated successfully",
        success: true,
        data: updatedAccount,
      });
    } catch (error: any) {
      console.error("❌ Update Account Info Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to update account info",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Delete Account Info
  // ---------------------------------------------------------------------------
  async handleDeleteAccountInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await accountService.deleteAccountInfo(id);

      return res.status(200).json({
        message: result.message,
        success: true,
      });
    } catch (error: any) {
      console.error("❌ Delete Account Info Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to delete account info",
        success: false,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Get All Account Info
  // ---------------------------------------------------------------------------
  async handleGetAllAccountInfo(req: Request, res: Response) {
    try {
      const result = await accountService.getAllAccountInfo();

      return res.status(200).json({
        message: "Account info fetched successfully",
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("❌ Get All Account Info Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch account info",
        success: false,
        data: null,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Get Account Info by ID
  // ---------------------------------------------------------------------------
  async handleGetAccountInfoById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await accountService.getAccountInfoById(id);

      return res.status(200).json({
        message: "Account info fetched successfully",
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("❌ Get Account Info By ID Error:", error);
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch account info",
        success: false,
        data: null,
      });
    }
  }
}
