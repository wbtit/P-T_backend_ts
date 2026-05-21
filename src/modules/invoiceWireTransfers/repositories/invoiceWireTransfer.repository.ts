import prisma from "../../../config/database/client";
import {
  CreateInvoiceWireTransferInput,
  UpdateInvoiceWireTransferInput,
  GetInvoiceWireTransferInput,
} from "../dtos";

const INVOICE_INCLUDE = {
  select: {
    id: true,
    invoiceNumber: true,
    jobName: true,
    totalInvoiceValue: true,
    status: true,
  },
} as const;

export class InvoiceWireTransferRepository {
  async create(data: CreateInvoiceWireTransferInput, userId: string) {
    const { invoiceIds, ...rest } = data;
    return prisma.invoiceWireTransfers.create({
      data: {
        ...rest,
        createdBy: userId,
        invoices: {
          connect: invoiceIds.map((id) => ({ id })),
        },
      },
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateInvoiceWireTransferInput) {
    const { invoiceIds, ...rest } = data;
    const updateData: any = { ...rest };

    if (invoiceIds) {
      updateData.invoices = {
        set: invoiceIds.map((id) => ({ id })),
      };
    }

    return prisma.invoiceWireTransfers.update({
      where: { id },
      data: updateData,
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });
  }

  async get(data: GetInvoiceWireTransferInput) {
    return prisma.invoiceWireTransfers.findUnique({
      where: { id: data.id },
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.invoiceWireTransfers.delete({
      where: { id },
    });
  }

  async getAll() {
    return prisma.invoiceWireTransfers.findMany({
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getByInvoiceId(invoiceId: string) {
    return prisma.invoiceWireTransfers.findMany({
      where: {
        invoices: { some: { id: invoiceId } },
      },
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getByCreatedBy(userId: string) {
    return prisma.invoiceWireTransfers.findMany({
      where: { createdBy: userId },
      include: {
        invoices: INVOICE_INCLUDE,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
