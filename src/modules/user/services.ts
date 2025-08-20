import { AppError } from "../../config/utils/AppError";
import bcrypt from 'bcrypt-ts'
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
    findAllUsers
} from "./repository";
import { cleandata } from "../../config/utils/cleanDataObject";

export class UserService{
    
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
}