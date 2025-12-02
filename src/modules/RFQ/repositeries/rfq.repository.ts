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
        return await prisma.rFQ.update({
            where: { id },
            data: {
                ...data,
                connectionDesignerRFQ: data.ConnectionDesignerIds
        ? {
            connect: data.ConnectionDesignerIds.map(id => ({ id }))
          }
        : undefined,
                files: data.files === null ? Prisma.JsonNull : data.files, // 👈 convert null
            },include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true
            }
        });
    }

    async getById(data:GetRfqInput) {
        return await prisma.rFQ.findUnique({
            where: { id:data.id },
            include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true,
                fabricator:true
            }
        });
    }
    
    async getByName(id:string) {
        return await prisma.rFQ.findUnique({
            where: { projectNumber:id },
            include:{
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true
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
                fabricator:true
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
                fabricator:true
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
                responses:true
            }
        })
    }
}