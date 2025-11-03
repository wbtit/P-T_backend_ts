import prisma from "../../../config/database/client";
import { createAccountInfoSchemaData,updateAccountInfoSchemaData } from "../dtos";

export class AccountRepository{
    async create(data:createAccountInfoSchemaData, invoiceId: string){
        return await prisma.accountInfo.create({
      data:{
        ...data,
        invoice: {
          connect: {
            id: invoiceId||"",
          },
        },
      } ,
    });
    }
    async update(data:updateAccountInfoSchemaData,id:string){
        return await prisma.accountInfo.update({
      where: { id },
      data,
    });
    }
    async delete(id:string){
        return await prisma.accountInfo.delete({
      where: { id },
    });
    }
    async getAll(){
        return await prisma.accountInfo.findMany({});
    }
    async getById(id:string){
        return await prisma.accountInfo.findUnique({
      where: { id },
    });
    }

}