import {
  CreateVendorQuotaInput,
  UpdateVendorQuotaInput,
  GetVendorQuotaInput,
  DeleteVendorQuotaInput,
} from "../dto";

import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";

export class VendorQuotaRepository {
  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------
  async create(data: CreateVendorQuotaInput & { serialNo: string }) {
    return this.createWithTx(prisma, data);
  }

  async createWithTx(
    tx: Prisma.TransactionClient | typeof prisma,
    data: CreateVendorQuotaInput & { serialNo: string }
  ) {
    return tx.vendorQuota.create({
      data: {
        ...data,
      },
      include: {
        vendor: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Get All
  // -----------------------------------------------------------------------
  async findAll() {
    return prisma.vendorQuota.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        vendor: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Get By ID
  // -----------------------------------------------------------------------
  async findById(input: GetVendorQuotaInput) {
    return prisma.vendorQuota.findUnique({
      where: { id: input.id },
      include: {
        vendor: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Get By Vendor ID
  // -----------------------------------------------------------------------
  async findByVendorId(vendorId: string) {
    return prisma.vendorQuota.findMany({
      where: {
        vendorId,
        isDeleted: false,
      },
      include: {
        vendor: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------
  async update(
    input: GetVendorQuotaInput,
    data: UpdateVendorQuotaInput
  ) {
    return prisma.vendorQuota.update({
      where: { id: input.id },
      data: {
        bidprice: data.bidprice,
        estimatedHours: data.estimatedHours,
        weeks: data.weeks,
        rfqId: data.rfqId,
        vendorId: data.vendorId,
        approvalStatus: data.approvalStatus,
        approvalDate: data.approvalDate,
      },
      include: {
        vendor: true,
        rfq: true,
        awardedProjects: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Soft Delete
  // -----------------------------------------------------------------------
  async delete(input: DeleteVendorQuotaInput) {
    return prisma.vendorQuota.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
