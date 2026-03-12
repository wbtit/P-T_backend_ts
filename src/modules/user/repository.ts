import prisma from "../../config/database/client";
import { userRole, createUserInput, updateUserInput } from "./dtos";
import { cleandata } from "../../config/utils/cleanDataObject";

export const findUserByUsername = async (username: string) => {
  return prisma.user.findUnique({ where: { username } });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      phone: true,
      landline: true,
      altLandline: true,
      altPhone: true,
      designation: true,
      city: true,
      address: true,
      role: true,
      profilePic: true,
      isActive: true,
      FabricatorPointOfContacts: true,
    },
  });
};

/**
 * Returns ALL users regardless of active status.
 * Used internally by admin-level queries.
 */
export const findAllUsers = async () => {
  return await prisma.user.findMany({
    include: {
      FabricatorPointOfContacts: true,
    },
  });
};

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
        ? { department: { connect: { id: user.departmentId } } }
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

export const updateUser = async (id: string, user: updateUserInput) => {
  // Note: data should already be cleaned by the service layer before calling this
  return prisma.user.update({
    where: { id },
    data: {
      ...user,
      role: user.role as userRole,
    },
  });
};

export const updateUserProfilePic = async (id: string, profilePic: string) => {
  return prisma.user.update({
    where: { id },
    data: { profilePic },
    include: {
      FabricatorPointOfContacts: true,
    },
  });
};

export const deleteUser = async (id: string) => {
  return await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};

export const findUsersByRole = async (role: userRole) => {
  return await prisma.user.findMany({
    where: { role },
    include: {
      FabricatorPointOfContacts: true,
    },
  });
};

/**
 * Returns only ACTIVE users (isActive: true).
 * Use this for general user listings shown to the frontend.
 */
export const findAllUser = async () => {
  return await prisma.user.findMany({
    where: {
      isActive: true,
    },
    include: {
      FabricatorPointOfContacts: true,
    },
  });
};