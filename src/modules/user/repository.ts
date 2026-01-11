import prisma from "../../config/database/client"; 
import { userRole } from "./dtos";
import { createUserInput,updateUserInput } from "./dtos";
import { cleandata } from "../../config/utils/cleanDataObject";


export const findUserByUsername = async (username: string) => {
  return prisma.user.findUnique({ where: { username } });
};

export const findUserById=async(id:string)=>{
    return prisma.user.findUnique({where:{
      id},include:{
        FabricatorPointOfContacts:true
      }});
}
  
export const  findAllUsers=async()=>{
  return await prisma.user.findMany({include:{
    FabricatorPointOfContacts:true
  
  }});
}

export const createUser = async (user: createUserInput) => {
  return prisma.user.create({
    data: {
      username: user.username,
      password: user.password as string,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      phone: user.phone,
      landline: user.landline,
      altLandline: user.altLandline,
      altPhone: user.altPhone,
      designation: user.designation,
      city: user.city,
      zipCode: user.zipCode,
      state: user.state,
      country: user.country,
      address: user.address,
      role: user.role as userRole,
      ...(user.departmentId
        ? { Department: { connect: { id: user.departmentId } } }
        : {}),
      ...(user.fabricatorId
        ? { FabricatorPointOfContacts: { connect: { id: user.fabricatorId } } }
        : {}),
      ...(user.connectionDesignerId
        ? { connectionDesigner: { connect: { id: user.connectionDesignerId } } }
        : {}),

    },
  });
};

export const updateUser=async(id:string,user:updateUserInput)=>{
    const safeData =cleandata(user); FabricatorPointOfContacts:true

    return prisma.user.update({
        where:{id},
        data:{
            ...safeData,
            role: user.role as userRole,
        }
    });
  };


  export const deleteUser=async(id:string)=>{
    return await prisma.user.update({
        where:{id},
        data:{
          isActive:false
        }
    })
  }
  export const findUsersByRole= async(role:userRole)=>{
    return await prisma.user.findMany({
      where:{
        role:role
      },include:{
        FabricatorPointOfContacts:true
      }
    })
  }
