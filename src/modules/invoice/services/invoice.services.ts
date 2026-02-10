import { Invoicerepository } from "../repositories/invoice.repository";
import { AppError } from "../../../config/utils/AppError";
import {
  createInvoceData,
  updateInvoiceData} from "../dtos";

const invoiceRepo = new Invoicerepository();

export class InvoiceService {
  // ---------------------------------------------------------------------------
  // Create Invoice
  // ---------------------------------------------------------------------------
  async createInvoice(data: createInvoceData, userId: string) {
    if (!data.projectId || !data.fabricatorId) {
      throw new AppError("Project ID and Fabricator ID are required", 400);
    }

    const invoice = await invoiceRepo.createInvoice(data, userId);
    return invoice;
  }

  // ---------------------------------------------------------------------------
  // Update Invoice
  // ---------------------------------------------------------------------------
  async updateInvoice(id: string, data: updateInvoiceData) {
    const existingInvoice = await invoiceRepo.getById(id);
    if (!existingInvoice) {
      throw new AppError("Invoice not found", 404);
    }

    const updatedInvoice = await invoiceRepo.update(data, id);
    return updatedInvoice;
  }

  // ---------------------------------------------------------------------------
  // Delete Invoice
  // ---------------------------------------------------------------------------
  async deleteInvoice(id: string) {
    const invoice = await invoiceRepo.getById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    await invoiceRepo.deleteById(id);
    return { message: "Invoice deleted successfully" };
  }

  // ---------------------------------------------------------------------------
  // Get all Invoices
  // ---------------------------------------------------------------------------
  async getAllInvoices() {
    return await invoiceRepo.getAll();
  }

  // ---------------------------------------------------------------------------
  // Get all Invoices by Client ID
  // ---------------------------------------------------------------------------
  async getInvoicesByClientId(clientId: string) {
    if (!clientId) {
      throw new AppError("Client ID is required", 400);
    }

    const invoices = await invoiceRepo.getAllByClientId(clientId);
    return invoices;
  }

  // ---------------------------------------------------------------------------
  // Get Invoice by ID
  // ---------------------------------------------------------------------------
  async getInvoiceById(id: string) {
    const invoice = await invoiceRepo.getById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    return invoice;
  }

  async pendingInvoicesByFabricator(fabricatorId:string){
    return await invoiceRepo.pendingInvoicesByFabricator(fabricatorId)
  }
}
