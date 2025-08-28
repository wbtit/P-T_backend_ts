import { Prisma } from "@prisma/client";
import prisma from "../../../config/database/client";
import { CreateRfqInput,
    GetRfqInput,
    UpdateRfqInput
 } from "../dtos";

export class RFQRepository {
    async create(data: CreateRfqInput,createdById:string) {
            return await prisma.rFQ.create({
                data: {
          ...data,
          files: data.files === null ? Prisma.JsonNull : data.files, // 👈 convert null
          createdById
        },
        include: {
          sender: true,
          recipient: true,
          salesPerson: true,
          responses:true
        }
            });
    }
    async update(id: string, data: UpdateRfqInput) {
        return await prisma.rFQ.update({
            where: { id },
            data: {
                ...data,
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
                responses:true
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
        await prisma.rFQ.findMany({
            where:{
                senderId
            },
            include: {
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true
            }
        })
    }

    async Inbox(recipientId:string){
        await prisma.rFQ.findMany({
            where:{
                recipientId
            },
            include: {
                sender: true,
                recipient: true,
                salesPerson: true,
                responses:true
            }
        })
    }

    async closeRfq(id: string) {
        await prisma.rFQ.update({
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