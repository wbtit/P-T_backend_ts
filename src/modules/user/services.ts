import { AppError } from "../../config/utils/AppError";
import bcrypt from 'bcrypt-ts'
import { 
    createUserInput,
    updateUserInput,
    getUserInput,
    deleteUserInput, 
} from "./dtos";
import { findUserByUsername,findUserById,createUser,updateUser,deleteUser} from "./repository";

export class userService{
    
    async create(data:createUserInput){
        const password=process.env.DEFAULT_PASSWORD|| "your_default_password";
        const exsiting = await findUserByUsername(data.username);
        if(exsiting) throw new AppError("User already exsits",409);
        
        const hashedPassword = await bcrypt.hash(password,10);
        const user=await createUser({...data,password:hashedPassword});
        return {user}
    }
    async read(data:getUserInput){
        const user = await findUserById(data.id);
        if(!user) throw new AppError("User not Found",404)
        return {user};
    }

    async update(id:string,data:updateUserInput){
        const user = await updateUser(id,data);
        if(!user) throw new AppError("Failed to update User",202);
        return{user}
    }
    async delete(data:deleteUserInput){
        const user = await deleteUser(data.id);
         if(!user) throw new AppError("Failed to delete User",202);
        return{user}

    }
}