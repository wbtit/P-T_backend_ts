import prisma from "../../../config/database/client";
import { CreateCoResponseDto,UpdateCoResponseDto } from "../dtos";
export class CoResponseRepository {
    async createCoResponse(data: CreateCoResponseDto) {
        return await prisma.cOResponse.create({
      data: {
        Status: data.Status,
        description: data.description,
        files: data.files,
        parentResponse: { connect: { id: data.parentResponseId } },
        user: { connect: { id: data.userId } },
        COresponse: { connect: { id: data.CoId } },
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
}