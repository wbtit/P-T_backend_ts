// auth/repository.ts
import prisma from "../../../../config/database/client"; 

export const updatePassword = async (data: { id: string; newPassword: string }) => {
  return prisma.user.update({
    where: { id: data.id },
    data: { password: data.newPassword },
  });
};
