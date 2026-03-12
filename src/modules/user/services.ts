import { AppError } from "../../config/utils/AppError";
import bcrypt from "bcrypt-ts";
import { env } from "../../config/env";
import {
  createUserInput,
  updateUserInput,
  getUserInput,
} from "./dtos";
import {
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  findAllUsers,
  findAllUser,
  updateUserProfilePic,
} from "./repository";
import { cleandata } from "../../config/utils/cleanDataObject";

export class UserService {
  async create(data: createUserInput) {
    const existing = await findUserByUsername(data.username);
    if (existing) throw new AppError("User already exists", 409);

    const hashedPassword = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);
    const user = await createUser({ ...data, password: hashedPassword });
    return { user };
  }

  async read(data: getUserInput) {
    const user = await findUserById(data.id);
    if (!user) throw new AppError("User not found", 404);
    return { user };
  }

  async update(id: string, data: updateUserInput) {
    const cleanData = cleandata(data);
    const user = await updateUser(id, cleanData);
    if (!user) throw new AppError("Failed to update user", 404);
    return { user };
  }

  async delete(id: string) {
    const user = await deleteUser(id);
    if (!user) throw new AppError("Failed to delete user", 404);
    return { user };
  }

  /**
   * Returns all users regardless of active status.
   * Used for admin-level listings.
   */
  async readAll() {
    const users = await findAllUsers();
    if (!users || users.length === 0) {
      return { users: [] };
    }
    return { users };
  }

  async updateProfilePic(userId: string, profilePic: string) {
    const user = await findUserById(userId);
    if (!user) throw new AppError("User not found", 404);
    const updated = await updateUserProfilePic(userId, profilePic);
    return { user: updated };
  }

  /**
   * Returns only active users (isActive: true).
   * Used for general user listings shown on the frontend.
   */
  async getAllUsers() {
    const users = await findAllUser();
    if (!users) throw new AppError("Failed to fetch users", 500);
    return { users };
  }
}
