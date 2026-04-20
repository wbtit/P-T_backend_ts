import prisma from "../../../config/database/client";
import { createAccountInfoSchemaData,updateAccountInfoSchemaData } from "../dtos";

export class AccountRepository{
    async create(data:createAccountInfoSchemaData){
        const normalizedData = {
          ...data,
          abaRoutingNumber: data.abaRoutingNumber ?? undefined,
          accountNumber: data.accountNumber ?? undefined,
          accountName: data.accountName ?? undefined,
          paymentMethod: data.paymentMethod ?? undefined,
          institutionNumber: data.institutionNumber ?? undefined,
          transitNumber: data.transitNumber ?? undefined,
          bankName: data.bankName ?? undefined,
          accountType: data.accountType ?? undefined,
          beneficiaryInfo: data.beneficiaryInfo ?? undefined,
          beneficiaryAddress: data.beneficiaryAddress ?? undefined,
          bankInfo: data.bankInfo ?? undefined,
          bankAddress: data.bankAddress ?? undefined,
        };

        return await prisma.accountInfo.create({
      data: normalizedData as any,
    });
    }
    async update(data:updateAccountInfoSchemaData,id:string){
        const normalizedData = {
          ...data,
          abaRoutingNumber: data.abaRoutingNumber ?? undefined,
          accountNumber: data.accountNumber ?? undefined,
          accountName: data.accountName ?? undefined,
          paymentMethod: data.paymentMethod ?? undefined,
          institutionNumber: data.institutionNumber ?? undefined,
          transitNumber: data.transitNumber ?? undefined,
          bankName: data.bankName ?? undefined,
          accountType: data.accountType ?? undefined,
          beneficiaryInfo: data.beneficiaryInfo ?? undefined,
          beneficiaryAddress: data.beneficiaryAddress ?? undefined,
          bankInfo: data.bankInfo ?? undefined,
          bankAddress: data.bankAddress ?? undefined,
        };

        return await prisma.accountInfo.update({
      where: { id },
      data: normalizedData,
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
