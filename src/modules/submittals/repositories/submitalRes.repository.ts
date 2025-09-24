import { State } from "@prisma/client";
import prisma from "../../../config/database/client";
import { createSubResDto } from "../dtos";

export class SubmittalResponse{
    async update(parentResponseId:string,status:State){
         if(parentResponseId!=undefined){
            return await prisma.submittalsResponse.update({
              where:{id:parentResponseId},
              data:{
                wbtStatus:status
              }
            })
    }
}

    async create(data:createSubResDto,userId:string){
        return await prisma.submittalsResponse.create({
    data:{
     reason:data.reason || "",
     description:data.description,
     userId:userId,
     files:data.files,
     submittalsId:data.submittalsId ,
     parentResponseId:data.parentResponseId||null
    }
  })
    }

    async getById(id:string){
        return await prisma.submittalsResponse.findUnique({
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