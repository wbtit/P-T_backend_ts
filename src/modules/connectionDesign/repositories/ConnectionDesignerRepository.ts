import {
  CreateConnectionDesignerInput,
  UpdateConnectionDesignerInput,
  GetConnectionDesignerInput,
  DeleteConnectionDesignerInput
} from "../dtos";

import prisma from "../../../config/database/client";

export class ConnectionDesignerRepository {

  // Create Connection Designer
  async create(data: CreateConnectionDesignerInput) {
    return prisma.connectionDesigner.create({
      data,
      include: {
        CDEngineers: true,
        CDQuotations: true,
        project: true,
      },
    });
  }

  // Get all connection designers
  async findAll() {
    return prisma.connectionDesigner.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        CDEngineers: true,
        CDQuotations: true,
        project: true,
      },
    });
  }

  // Get by ID
  async findById(input: GetConnectionDesignerInput) {
    return prisma.connectionDesigner.findUnique({
      where: { id: input.id },
      include: {
        CDEngineers: true,
        CDQuotations: true,
        project: true,
      },
    });
  }

  // Get by name
  async findByName(name: string) {
    return prisma.connectionDesigner.findFirst({
      where: { name, isDeleted: false },
      include: {
        CDEngineers: true,
        CDQuotations: true,
        project: true,
      },
    });
  }

  // Update
  async update(input: GetConnectionDesignerInput, data: UpdateConnectionDesignerInput) {
    return prisma.connectionDesigner.update({
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
        CDEngineers: true,
        CDQuotations: true,
        project: true,
      },
    });
  }

  // Soft delete
  async delete(input: DeleteConnectionDesignerInput) {
    return prisma.connectionDesigner.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
      },
    });
  }
}
