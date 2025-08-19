// auth/repository.ts
import prisma from "../../../config/database/client";
import { SignupInput,userRole } from "../dtos";

export const findUserByEmail = async (username: string) => {
  return prisma.user.findUnique({ where: { username } });
};
  
export const createUser = async (user: SignupInput) => {
  return prisma.user.create({
    data: {
      username: user.username,
      password: user.password,
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
      departmentId: user.departmentId
    },
  });
};

export const updatePassword = async (data: { id: string; newPassword: string }) => {
  return prisma.user.update({
    where: { id: data.id },
    data: { password: data.newPassword },
  });
};
