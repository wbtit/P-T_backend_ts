import { AppError } from "../../config/utils/AppError";
import bcrypt from 'bcrypt-ts'
import { z } from "zod";
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
    updateUserProfilePic
} from "./repository";
import { cleandata } from "../../config/utils/cleanDataObject";

const envSchema = z.object({
    DEFAULT_PASSWORD: z
      .string()
      .min(12, "DEFAULT_PASSWORD must be at least 12 characters")
      .regex(/[a-z]/, "DEFAULT_PASSWORD must include a lowercase letter")
      .regex(/[A-Z]/, "DEFAULT_PASSWORD must include an uppercase letter")
      .regex(/\d/, "DEFAULT_PASSWORD must include a number")
      .regex(/[^A-Za-z0-9]/, "DEFAULT_PASSWORD must include a special character"),
});

const { DEFAULT_PASSWORD } = envSchema.parse(process.env);

export class UserService{
    
    async create(data:createUserInput){
        const exsiting = await findUserByUsername(data.username);
        if(exsiting) throw new AppError("User already exsits",409);
        
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD,10);
        const user=await createUser({...data,password:hashedPassword});
        return {user}
    }
    async read(data:getUserInput){
        const user = await findUserById(data.id);
        if(!user) throw new AppError("User not Found",404)
        return {user};
    }

    async update(id:string,data:updateUserInput){
        const cleanData= cleandata(data)
        const user = await updateUser(id,cleanData);
        if(!user) throw new AppError("Failed to update User",404);
        return{user}
    }
    async delete(id:string){
        const user = await deleteUser(id);
         if(!user) throw new AppError("Failed to delete User",404);
        return{user}

    }

    async readAll(){
        const users = await findAllUsers();
        if (!users || users.length === 0) {
        return { users: [] };
    }
        if(!users) throw new AppError("Failed to fetch users",500);
        return {users};
    }

    async updateProfilePic(userId: string, profilePic: string) {
        const user = await findUserById(userId);
        if (!user) throw new AppError("User not Found", 404);
        const updated = await updateUserProfilePic(userId, profilePic);
        return { user: updated };
    }
}
