import { AccountRepository } from "../repositories";
import { AppError } from "../../../config/utils/AppError";
import {
  createAccountInfoSchemaData,
  updateAccountInfoSchemaData,
} from "../dtos";

const accountRepo = new AccountRepository();

export class AccountService {
  // ---------------------------------------------------------------------------
  // Create Account Info
  // ---------------------------------------------------------------------------
  async createAccountInfo(data: createAccountInfoSchemaData, invoiceId: string) {
    if (!invoiceId) {
      throw new AppError("Invoice ID is required", 400);
    }

    const accountInfo = await accountRepo.create(data, invoiceId);
    return accountInfo;
  }

  // ---------------------------------------------------------------------------
  // Update Account Info
  // ---------------------------------------------------------------------------
  async updateAccountInfo(id: string, data: updateAccountInfoSchemaData) {
    const existingAccount = await accountRepo.getById(id);
    if (!existingAccount) {
      throw new AppError("Account info not found", 404);
    }

    const updatedAccount = await accountRepo.update(data, id);
    return updatedAccount;
  }

  // ---------------------------------------------------------------------------
  // Delete Account Info
  // ---------------------------------------------------------------------------
  async deleteAccountInfo(id: string) {
    const existingAccount = await accountRepo.getById(id);
    if (!existingAccount) {
      throw new AppError("Account info not found", 404);
    }

    await accountRepo.delete(id);
    return { message: "Account info deleted successfully" };
  }

  // ---------------------------------------------------------------------------
  // Get All Account Info
  // ---------------------------------------------------------------------------
  async getAllAccountInfo() {
    return await accountRepo.getAll();
  }

  // ---------------------------------------------------------------------------
  // Get Account Info by ID
  // ---------------------------------------------------------------------------
  async getAccountInfoById(id: string) {
    const accountInfo = await accountRepo.getById(id);
    if (!accountInfo) {
      throw new AppError("Account info not found", 404);
    }

    return accountInfo;
  }
}