import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import {createInvoceData,updateInvoiceData} from "../dtos/invoice.dto"

export class Invoicerepository{
    async createInvoice(data:createInvoceData,userId:string){
        return  await prisma.invoice.create({
      data: {
        projectId:data.projectId,
        fabricatorId:data.fabricatorId,
        customerName:data.customerName,
        contactName:data.contactName,
        clientId:data.clientId,
        address:data.address,
        stateCode:data.stateCode,
        GSTIN:data.GSTIN,
        invoiceNumber:data.invoiceNumber,
        placeOfSupply:data.placeOfSupply,
        jobName:data.jobName,
        currencyType:data.currencyType,
        totalInvoiceValue:data.totalInvoiceValue,
        totalInvoiceValueInWords:data.totalInvoiceValueInWords,
        createdBy:userId,
        pointOfContact:{connect:{id:data.clientId}},
        invoiceItems: {
          create: data.invoiceItems || [],
        },
        
      },
      include: { invoiceItems: true },
    });
    }

    async getAll(){
        return await prisma.invoice.findMany({
      include: { invoiceItems: true ,pointOfContact:true},
    });
    }
    async getAllByClientId(clientId:string){
        return await prisma.invoice.findMany({
      where:{
        clientId:clientId
      },
       include: { invoiceItems: true,pointOfContact:true},
     })
    }
    async getById(id:string){
        return await prisma.invoice.findUnique({
      where: { id },
      include: { invoiceItems: true, pointOfContact:true,
        fabricator:{select:{
          accountId:true,
          bankAccount:true,
        }
        }
      },
    });
    }

    async delete(id:string){
        return await prisma.invoice.delete({
            where:{id}
        })
    }
    
    async update(data:updateInvoiceData,id:string){
        const { invoiceItems, accountInfo, ...restOfData } = data;
        
        const updateData: Prisma.InvoiceUpdateInput = {
            ...restOfData,
        };
        
        if (invoiceItems) {
            updateData.invoiceItems = {
                deleteMany: {},
                create: invoiceItems,
            };
        }
        
        
        return await prisma.invoice.update({
      where: { id:id },
      data: updateData,
      include: { invoiceItems: true },
    });
    }
    async deleteById(id:string){
        return await prisma.invoice.delete({
      where: { id },
    });
    }
}