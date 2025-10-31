import prisma from "../../../../config/database/client";
import { CreateBranchInput,DeleteBranchInput } from "../dtos";

export class BranchRepository{
    async createBranch(input:CreateBranchInput){
        return await prisma.branch.create({
            data:input
        })
    }
    async deleteBranch(input:DeleteBranchInput){
        return await prisma.branch.delete({
            where:{
                id:input.id
            }
        })
    }
    async findByName(name: string) {
        return await prisma.branch.findFirst({
            where: {
                name
            }
        })
    }
    async finndByFabricatorId(fabricatorId:string){
        return await prisma.branch.findFirst({where:{
            fabricatorId:fabricatorId,
        }})
    }
}