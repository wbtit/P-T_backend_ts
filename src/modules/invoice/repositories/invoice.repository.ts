import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import {createInvoceData,updateInvoiceData} from "../dtos/invoice.dto"
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

export class Invoicerepository{
    async createInvoice(data:createInvoceData,userId:string){
        return  await prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: data.projectId },
            select: { projectCode: true, projectNumber: true },
          });
          if (!project) {
            throw new AppError("Project not found for invoice serial generation", 404);
          }

          const serialNo = await generateProjectScopedSerial(tx, {
            prefix: SERIAL_PREFIX.INVOICE,
            projectScopeId: data.projectId,
            projectToken: project.projectCode ?? project.projectNumber,
          });

          return tx.invoice.create({
            data: {
              serialNo,
              projectId:data.projectId,
              fabricatorId:data.fabricatorId,
              customerName:data.customerName,
              contactName:data.contactName,
              clientId:data.clientId,
              address:data.address,
              stateCode:data.stateCode,
              GSTIN:data.GSTIN,
              invoiceNumber: serialNo,
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

    async pendingInvoicesByFabricator(fabricatorId:string){
        const invoices = await prisma.invoice.findMany({
            where:{
                fabricatorId:fabricatorId,
                status:"PENDING"
            },
            include:{
                pointOfContact:true,
                invoiceItems:true
            }
        })
        return invoices;
    }

    async pendingInvoicesByClient(clientId:string){
        const invoices = await prisma.invoice.findMany({
            where:{
                clientId:clientId,
                status:"PENDING"
            },
            include:{
                fabricator:{select:{
                    accountId:true,
                    bankAccount:true,
                }},
                invoiceItems:true
            }
        })
        return invoices;
}
}
