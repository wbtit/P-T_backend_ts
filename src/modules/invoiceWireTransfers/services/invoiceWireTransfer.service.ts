import { AppError } from "../../../config/utils/AppError";
import {
  CreateInvoiceWireTransferInput,
  UpdateInvoiceWireTransferInput,
  GetInvoiceWireTransferInput,
} from "../dtos";
import { InvoiceWireTransferRepository } from "../repositories";

const repository = new InvoiceWireTransferRepository();

export class InvoiceWireTransferService {
  async create(data: CreateInvoiceWireTransferInput, userId: string) {
    const result = await repository.create(data, userId);
    return result;
  }

  async update(id: string, data: UpdateInvoiceWireTransferInput) {
    const existing = await repository.get({ id });
    if (!existing) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    const result = await repository.update(id, data);
    return result;
  }

  async get(data: GetInvoiceWireTransferInput) {
    const result = await repository.get(data);
    if (!result) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    return result;
  }

  async delete(id: string) {
    const existing = await repository.get({ id });
    if (!existing) {
      throw new AppError("Invoice wire transfer not found", 404);
    }
    const result = await repository.delete(id);
    return result;
  }

  async getAll() {
    return repository.getAll();
  }

  async getByInvoiceId(invoiceId: string) {
    return repository.getByInvoiceId(invoiceId);
  }

  async getByCreatedBy(userId: string) {
    return repository.getByCreatedBy(userId);
  }
}
