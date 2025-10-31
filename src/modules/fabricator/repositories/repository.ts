import { 
     CreateFabricatorInput,
     UpdateFabricatorInput, 
     GetFabricatorInput, 
     DeleteFabricatorInput
 } from "../dtos";

 import prisma from "../../../config/database/client";

 export class FabricatorRepository {
      async create(data: CreateFabricatorInput, userId: string) {
    return prisma.fabricator.create({
      data: {
        ...data,
        createdById: userId,
      },
    include:{
      branches:true,
      project:true
    }
    });
  }

  // Get all fafiles: z.union([z.array(z.any()), z.null()]).optional(),bricators
  async findAll() {
    return prisma.fabricator.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  // Get fabricator by ID
  async findById(input: GetFabricatorInput){
    return prisma.fabricator.findUnique({
      where: { id: input.id },
      include:{
        branches:true,
        project:true
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
        project:true
      }
    });
  }
  //Get by createdById
  async findByCreatedById(createdById: GetFabricatorInput) {
    return prisma.fabricator.findMany({
      where: { createdById: createdById.id },
      include:{
        branches:true,
        project:true
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
        files: data.files ?? [],
      },
      include:{
        branches:true,
        project:true
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