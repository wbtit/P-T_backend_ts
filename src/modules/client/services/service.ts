import { createUser,deleteUser,findUserById,findUsersByRole,updateUser } from "../../user/repository";
import { createUserInput,updateUserInput } from "../../user/dtos";
import { BranchRepository } from "../../fabricator/branches";
import { AppError } from "../../../config/utils/AppError";
import prisma from "../../../config/database/client";

const branchRepo = new BranchRepository();


export class ClientService{
    async createClient(data:createUserInput,fabricatorId:string){
       const branch = await branchRepo.finndByFabricatorId(fabricatorId);
       if(!branch){
        throw new AppError("Branch does not exist",401)
       }
        const clientData: createUserInput = {
    ...data,
    password: data.password || "Qwerty!23456",
    role: "CLIENT",
    address: branch.address || data.address || "",
    city: branch.city || data.city || "",
    state: branch.state || data.state || "",
    zipCode: branch.zipCode || data.zipCode || "",
    country: branch.country || data.country || "",
    fabricatorId: fabricatorId,

  };

  const client = createUser(clientData)
  return client
}

async updateClient(userId:string,data:updateUserInput){
    return await updateUser(userId,data)
}

async deleteClient(userId:string){
    return await deleteUser(userId)
}

async getAllClients(){
    return await findUsersByRole("CLIENT")
}
async getAllClinetByFabricatorId(fabricatorId:string){
    return await prisma.user.findMany({
        where:{
            FabricatorPointOfContacts:{
                some:{
                    id:fabricatorId
                }
            }
        }
    })
}

async getClientById(userId:string){
    return await findUserById(userId)
}
}