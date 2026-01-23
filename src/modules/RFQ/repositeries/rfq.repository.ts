import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";
import { cleandata } from "../../../config/utils/cleanDataObject";

export class RFQRepository {
    async create(data: CreateRfqInput) {
  const cleanedData = cleandata(data);

  return await prisma.rFQ.create({
    data: cleanedData,
    include: {
      sender: true,
      recipient: true,
      salesPerson: true,
      responses: true
    }
  });
}

    async update(id: string, data: UpdateRfqInput) {
        const { ConnectionDesignerIds,connectionEngineerIds, ...rest } = data;
        return await prisma.rFQ.update({
            where: { id },
            data: {
                ...rest,
                connectionDesignerRFQ: ConnectionDesignerIds
        ? {
             set: [],
            connect: ConnectionDesignerIds.map(id => ({ id }))
          }
        : undefined,
        connectionEngineers: connectionEngineerIds
        ? {
             set: [],
            connect: connectionEngineerIds.map(id => ({ id }))
          }
        : undefined,
            },include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });
    }

    async getAllRFQ(){
        return await prisma.rFQ.findMany({
            include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async getById(data:GetRfqInput) {
        return await prisma.rFQ.findUnique({
            where: { id: data.id },
            include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                fabricator:true,
                project: {select:{name:true}},
                connectionEngineers:{select:{firstName:true,lastName:true,id:true}},
                connectionDesignerRFQ:{
                    include:{
                        CDEngineers: true,
                        CDQuotations:true,
                    }
                }
            }
        });
        

        
    }
    
    async getByName(id:string) {
        return await prisma.rFQ.findUnique({
            where: { id:id },
            include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                project: {select:{name:true}},
                connectionDesignerRFQ:true,
                connectionEngineers:true,
            }
        });

    }
    async sentTouser(senderId:string){
        return await prisma.rFQ.findMany({
            where:{
                senderId
            },
            include: {
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async Inbox(recipientId:string){
        return await prisma.rFQ.findMany({
            where:{
                recipientId
            },
            include: {
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                fabricator:true,
                project: {select:{name:true}},
            }
        })
    }

    async closeRfq(id: string) {
        return await prisma.rFQ.update({
            where: { id },
            data: { status: "CLOSED" },
            include: {
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                project: {select:{name:true}},
            }
        })
    }

    async getPendingRFQs(){
        return await prisma.rFQ.findMany({
            where: {
          responses: { none: {} },
        },
        include:{
            sender: true,
            recipient: true,
            salesPerson: true,
            responses:true,
            fabricator:true,
            project: {select:{name:true}},
        }
        })
    }
getbyProjectNameAndLocation(projectName:string,location:string){
    return prisma.rFQ.findFirst({
        where:{
            projectName,
            location
        },include:{
            sender: true,
            recipient: true,
            salesPerson: true,
            responses:true,
            fabricator:true,
            project: {select:{name:true}},
        }
    });
    }
async deleteRFQ(id:string){
    return await prisma.rFQ.delete({
        where:{
            id
        }
    })
}
}

