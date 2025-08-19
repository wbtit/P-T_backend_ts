// auth/repository.ts
import prisma from "../../../config/database/client";
import { SignupInput } from "../dtos/auth.dto";

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = async (user: SignupInput) => {
  return prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      password: user.password, // hash this in service layer, not here
      profileImage: user.profileImage,
      bio: user.bio,
      website: user.website,
      location: user.location,
    },
  });
};

export const updatePassword = async (data: { id: string; newPassword: string }) => {
  return prisma.user.update({
    where: { id: data.id },
    data: { password: data.newPassword },
  });
};
