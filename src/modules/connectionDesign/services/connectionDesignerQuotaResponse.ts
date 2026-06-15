import { AppError } from "../../../config/utils/AppError";
import { ConnectionDesignerQuotaResponseRepository } from "../repositories";
import {
  CreateConnectionDesignerQuotaResponseInput,
  UpdateConnectionDesignerQuotaResponseInput,
  GetConnectionDesignerQuotaResponseInput,
  DeleteConnectionDesignerQuotaResponseInput
} from "../dtos";

const repo = new ConnectionDesignerQuotaResponseRepository();

export class ConnectionDesignerQuotaResponseService {
  async createResponse(data: CreateConnectionDesignerQuotaResponseInput) {
    if (!data.quotaId) {
      throw new AppError("quotaId is required", 400);
    }
    
    // Validate if parent exists if parentId is provided
    if (data.parentId) {
      const parent = await repo.findById({ id: data.parentId });
      if (!parent) {
        throw new AppError("Parent response not found", 404);
      }
    }

    return repo.create(data);
  }

  async getAllResponses() {
    return repo.findAll();
  }

  async getResponseById(input: GetConnectionDesignerQuotaResponseInput) {
    const response = await repo.findById(input);
    if (!response) throw new AppError("Connection Designer Quota Response not found", 404);
    return response;
  }

  async getResponsesByQuotaId(quotaId: string) {
    return repo.findByQuotaId(quotaId);
  }

  async updateResponse(
    input: GetConnectionDesignerQuotaResponseInput,
    data: UpdateConnectionDesignerQuotaResponseInput
  ) {
    const existing = await repo.findById(input);
    if (!existing) throw new AppError("Connection Designer Quota Response not found", 404);

    return repo.update(input, data);
  }

  async deleteResponse(input: DeleteConnectionDesignerQuotaResponseInput) {
    const existing = await repo.findById({ id: input.id });
    if (!existing) throw new AppError("Connection Designer Quota Response not found", 404);

    await repo.delete(input);
    return { message: "Connection Designer Quota Response deleted successfully" };
  }
}
