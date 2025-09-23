import { CreateRfiResDto,
    UpdateRfiResDto
} from "../dtos";
import prisma from "../../../config/database/client";

export class RFIResponseRepository{
    async updateWithParentId(data:UpdateRfiResDto){
        return await prisma.rFIResponse.update({
      where:{id:data.parentResponseId},
      data:{
        wbtStatus:data.wbtStatus,
        responseState:data.responseState
      }
    });
    }

    async create(data:CreateRfiResDto,userId:string){
        return await prisma.rFIResponse.create({
      data:{
        responseState:data.responseState,
        reason:data.reason,
        userId:userId,
        files:data.files,
        rfiId:data.rfiId,
        parentResponseId:data.parentResponseId||null
      },
      
    })
    }
    async findById(id:string){
        return await prisma.rFIResponse.findUnique({
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

    async findByProjectId(projectId:string){
        return await prisma.rFI.findMany({
      where:{project_id:projectId},
      include:{
        fabricator:true,
        project:true,
        recepients:true,
        sender:true,
        rfiresponse:true,
      }
    })
    }
}