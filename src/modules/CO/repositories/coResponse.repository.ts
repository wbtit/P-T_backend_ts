import prisma from "../../../config/database/client";
import { CreateCoResponseDto,UpdateCoResponseDto } from "../dtos";
import { AppError } from "../../../config/utils/AppError";
export class CoResponseRepository {
    async createCoResponse(data: CreateCoResponseDto, CoId: string, userId: string) {
        console.log("changeOrderId:",CoId)
        const connectParent = data.parentResponseId  && data.parentResponseId !== '' ? { connect: { id: data.parentResponseId } } : undefined;
        if (CoId) {
            const co = await prisma.changeOrder.findUnique({ where: { id: CoId } });
            if (!co) throw new AppError("ChangeOrder not found", 404);
        }
        return await prisma.cOResponse.create({
      data: {
        Status: data.Status,
        description: data.description,
        files: data.files,
        ...(connectParent && { parentResponse: connectParent }),
        user: { connect: { id: userId } },
        coResponse: CoId ? { connect: { id: CoId } } : undefined,
      },
    });
}
async getResponseById(id: string) {
    return await prisma.cOResponse.findUnique({
      where:{id:id},
      include:{
        childResponses:true,
        user:{
          select:{
            firstName:true,
            middleName:true,
            lastName:true
          }
        }
      }
    })
}
async findbyId(id:string){
  return await prisma.cOResponse.findUnique({
    where:{id:id}
  })            
}
async getAll(){
  return await prisma.cOResponse.findMany()
}
}
