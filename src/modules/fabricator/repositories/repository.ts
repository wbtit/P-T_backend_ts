import { 
     CreateFabricatorInput,
     UpdateFabricatorInput, 
     GetFabricatorInput, 
     DeleteFabricatorInput
 } from "../dtos";

 import prisma from "../../../config/database/client";

 export class FabricatorRepository {
      async create(data: CreateFabricatorInput, userId: string) {
    const {
      pointOfContact,
      wbtFabricatorPointOfContact,
      ...safeData
    } = data;

    return prisma.fabricator.create({
      data: {
        ...safeData,
        createdById: userId,
        pointOfContact: pointOfContact?.length
          ? {
              connect: pointOfContact.map((id) => ({ id })),
            }
          : undefined,
        wbtFabricatorPointOfContact: wbtFabricatorPointOfContact?.length
          ? {
              connect: wbtFabricatorPointOfContact.map((id) => ({ id })),
            }
          : undefined,
      },
    include:{
      branches:true,
      project:true,
      pointOfContact:true,
      wbtFabricatorPointOfContact:true
    }
    });
  }



  // Get all fabricators
  async findAll() {
    return prisma.fabricator.findMany({
      orderBy: { createdAt: "desc" },
       include:{
      branches:true,
      project:true,
      pointOfContact:true,
      wbtFabricatorPointOfContact:true
    }
    });
  }

  // Get fabricator by ID
  async findById(input: GetFabricatorInput){
    return prisma.fabricator.findUnique({
      where: { id: input.id },
      include:{
        branches:true,
        project:true,
        pointOfContact:true,
        wbtFabricatorPointOfContact:true
      }
    });
  }
  async findByIdHeadquaters(id:string){
    return await prisma.fabricator.findFirst({
      where:{
        id,
        
      }
    })
  }

  //Get by fabName
  async findByName(fabName: string) {
    return prisma.fabricator.findUnique({
      where: { fabName },
      include:{
        branches:true,
        project:true,
        pointOfContact:true,
        wbtFabricatorPointOfContact:true
      }
    });
  }
  //Get by createdById
  async findByCreatedById(createdById: GetFabricatorInput) {
    return prisma.fabricator.findMany({
      where: { createdById: createdById.id },
      include:{
        branches:true,
        project:true,
        pointOfContact:true,
        wbtFabricatorPointOfContact:true
      }
    });
  }

  // Update fabricator
  async update(input: GetFabricatorInput, data: UpdateFabricatorInput){
    return prisma.fabricator.update({
      where: { id: input.id },
      data: {
        fabName: data.fabName,
        website: data.website ?? null,
        drive: data.drive ?? null,
        fabricatPercentage: data.fabricatPercentage,
        approvalPercentage: data.approvalPercentage,
        paymenTDueDate: data.paymenTDueDate,
        files: data.files ?? [],
        accountId: data.accountId ?? null,
        currencyType: data.currencyType,
        fabStage: data.fabStage,
      },
      include:{
        branches:true,
        project:true,
        pointOfContact:true,
        wbtFabricatorPointOfContact:true
      }
    });
  }

  // Delete fabricator
  async delete(input: DeleteFabricatorInput){
    return prisma.fabricator.update({
      where: { id: input.id },
      data:{
        isDeleted: true
      }
    });
  }
 }
