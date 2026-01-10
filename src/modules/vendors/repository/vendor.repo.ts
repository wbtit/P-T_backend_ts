import {
  CreateVendorInput,
  UpdateVendorInput,
  GetVendorInput,
  DeleteVendorInput
} from "../dto";

import prisma from "../../../config/database/client";

export class VendorRepository {

  // Create Connection Designer
  async create(data: CreateVendorInput) {
    return prisma.vendor.create({
      data,
      include: {
        pointOfContacts: true,
        vendorQuotations: true,
        project: true,
      },
    });
  }

  // Get all connection designers
  async findAll() {
    return prisma.vendor.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        pointOfContacts: true,
        vendorQuotations: true,
        project: true,
      },
    });
  }

  // Get by ID
  async findById(input: GetVendorInput) {
    return prisma.vendor.findUnique({
      where: { id: input.id },
      include: {
        pointOfContacts: true,
        vendorQuotations: true,
        project: true,
      },
    });
  }

  // Get by name
  async findByName(name: string) {
    return prisma.vendor.findFirst({
      where: { name, isDeleted: false },
      include: {
        pointOfContacts: true,
        vendorQuotations: true,
        project: true,
      },
    });
  }

  // Update
  async update(input: GetVendorInput, data: UpdateVendorInput) {
    return prisma.vendor.update({
      where: { id: input.id },
      data: {
        name: data.name,
        state: data.state ?? "[]",
        contactInfo: data.contactInfo ?? null,
        websiteLink: data.websiteLink ?? null,
        email: data.email ?? null,
        location: data.location ?? null,
        files: data.files ?? "[]"
      },
      include: {
        pointOfContacts: true,
        vendorQuotations: true,
        project: true,
      },
    });
  }

  // Soft delete
  async delete(input: DeleteVendorInput) {
    return prisma.vendor.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
      },
    });
  }
}
