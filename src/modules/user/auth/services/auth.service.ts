import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt-ts'
import {
    SigninInput,
    SignupInput,
    ResetPasswordInput
} from '../dtos'
import { generateToken, JWT_SECRET } from '../../../../config/utils/jwtutils' 
import { AppError } from '../../../../config/utils/AppError' 
import { UserJwt } from '../../../../shared/types' 
import {updatePassword}  from "../repositories"
import { createUser,findUserByUsername } from '../../repository'

type AuthUser = {
    id: string;
    email: string | null;
    username: string;
    role: string;
    password: string;
    [key: string]: unknown;
};

const toJwtPayload = (user: AuthUser): UserJwt => ({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role as UserJwt["role"],
});

const sanitizeUser = <T extends { password?: string }>(user: T): Omit<T, "password"> => {
    const { password, ...safeUser } = user;
    return safeUser;
};

export const signup=async(data:SignupInput)=>{
    const exsiting = await findUserByUsername(data.username);
    if(exsiting) throw new AppError('User already exists',409);

    const hashedPassword = await bcrypt.hash(data.password,10);
    const user = await createUser({
        ...data,
        password:hashedPassword,
        role:"STAFF",
    }) as AuthUser;
   
    const token=generateToken(toJwtPayload(user));
    return {token,user:sanitizeUser(user)};
}

export const signin=async(data:SigninInput)=>{
    const user = await findUserByUsername(data.username) as AuthUser | null;
    if(!user) throw new AppError('User not found',409);


    const isMatch = await bcrypt.compare(data.password,user.password)
    if(!isMatch) throw new AppError('Invalid Password',401)
       
    const token = generateToken(toJwtPayload(user));
    return { token,user:sanitizeUser(user)};
}

export const resetPassword=async(data:ResetPasswordInput)=>{
    const decoded:UserJwt = jwt.verify(data.token,JWT_SECRET) as UserJwt
    const user = await findUserByUsername(decoded.username);
    if(!user) throw new AppError('Invalid token',401)
    
    const hashedPassword = await bcrypt.hash(data.newPassword,10);
    await updatePassword({
        id:user.id,
        newPassword:hashedPassword
    });

    return {message:"Password updated successfully"};
}
