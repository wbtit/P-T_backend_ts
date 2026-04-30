import prisma from "../../../config/database/client";
import { Prisma } from "@prisma/client";
import {createInvoceData,updateInvoiceData} from "../dtos/invoice.dto"
import { generateProjectScopedSerial, SERIAL_PREFIX } from "../../../utils/serial.util";
import { AppError } from "../../../config/utils/AppError";

const INVOICE_LIST_INCLUDE = {
    invoiceItems: true,
    pointOfContact: true,
    rfq: true,
    changeOrder: true,
    fabricator: {
        select: {
            id: true,
            fabName: true,
            accountId: true,
            bankAccount: true,
        },
    },
    project: {
        select: {
            id: true,
            name: true,
            projectCode: true,
            projectNumber: true,
        },
    },
} as const;

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
              rfqId:data.rfqId,
              changeOrderId:data.changeOrderId,
              status:data.status,
              customerName:data.customerName,
              contactName:data.contactName ?? undefined,
              clientId:data.clientId,
              type:data.type ?? undefined,
              address:data.address ?? undefined,
              stateCode:data.stateCode ?? undefined,
              GSTIN:data.GSTIN ?? undefined,
              invoiceNumber: data.invoiceNumber,
              invoiceDate:data.invoiceDate ? new Date(data.invoiceDate) : undefined,
              dateOfSupply:data.dateOfSupply ? new Date(data.dateOfSupply) : undefined,
              placeOfSupply:data.placeOfSupply ?? undefined,
              jobName:data.jobName,
              signature:data.signature,
              currencyType:data.currencyType,
              totalInvoiceValue:data.totalInvoiceValue,
              totalInvoiceValueInWords:data.totalInvoiceValueInWords ?? undefined,
              paymentStatus:data.paymentStatus,
              createdBy:userId,
              ...(data.clientId ? { pointOfContact:{connect:{id:data.clientId}} } : {}),
              invoiceItems: {
                create: data.invoiceItems || [],
              },
              
            },
            include: { invoiceItems: true, rfq: true, changeOrder: true },
          });
        });
    }

    async getAll(){
        return await prisma.invoice.findMany({
      include: { invoiceItems: true ,pointOfContact:true, rfq: true, changeOrder: true},
    });
    }
    async getAllByClientId(clientId:string){
        return await prisma.invoice.findMany({
      where:{
        clientId:clientId
      },
       include: { invoiceItems: true,pointOfContact:true, rfq: true, changeOrder: true},
     })
    }

    async findFabricatorIdsForUser(userId: string) {
        const fabricators = await prisma.fabricator.findMany({
            where: {
                isDeleted: false,
                OR: [
                    { createdById: userId },
                    { pointOfContact: { some: { id: userId } } },
                    { wbtFabricatorPointOfContact: { some: { id: userId } } },
                ],
            },
            select: { id: true },
        });

        return fabricators.map((fabricator) => fabricator.id);
    }

    async findByFabricatorIds(fabricatorIds: string[]) {
        if (fabricatorIds.length === 0) return [];

        return await prisma.invoice.findMany({
            where: {
                fabricatorId: { in: fabricatorIds },
            },
            include: INVOICE_LIST_INCLUDE,
            orderBy: { createdAt: "desc" },
        });
    }

    async getById(id:string){
        return await prisma.invoice.findUnique({
      where: { id },
      include: { invoiceItems: true, pointOfContact:true, rfq: true, changeOrder: true,
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
        
        const updateData: Prisma.InvoiceUncheckedUpdateInput = {
            ...restOfData,
            type: restOfData.type ?? undefined,
            contactName: restOfData.contactName ?? undefined,
            address: restOfData.address ?? undefined,
            stateCode: restOfData.stateCode ?? undefined,
            GSTIN: restOfData.GSTIN ?? undefined,
            placeOfSupply: restOfData.placeOfSupply ?? undefined,
            totalInvoiceValueInWords: restOfData.totalInvoiceValueInWords ?? undefined,
            invoiceDate: restOfData.invoiceDate ? new Date(restOfData.invoiceDate) : restOfData.invoiceDate,
            dateOfSupply: restOfData.dateOfSupply ? new Date(restOfData.dateOfSupply) : restOfData.dateOfSupply,
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
      include: { invoiceItems: true, rfq: true, changeOrder: true },
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
                invoiceItems:true,
                rfq: true,
                changeOrder: true
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
                    project:{select:{
                        projectCode:true,
                        projectNumber:true
                    }},
                    accountId:true,
                    bankAccount:true,
                }},
                invoiceItems:true,
                rfq: true,
                changeOrder: true
            }
        })
        return invoices;
}
}
