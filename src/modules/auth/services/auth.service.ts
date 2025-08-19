import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt-ts'
import {
    SigninInput,
    SignupInput,
    ResetPasswordInput
} from '../dtos'
import { generateToken } from '../../../config/utils/jwtutils'
import { AppError } from '../../../config/utils/AppError'
import { UserJwt } from '../../../shared/types'
import {createUser,findUserByEmail,updatePassword}  from "../repositories"

const JWT_SECRET = process.env.JWT_SECRET || 'your_dev_secret';


export const signup=async(data:SignupInput)=>{
    const exsiting = await findUserByEmail(data.email);
    if(exsiting) throw new AppError('User already exists',409);

    const hashedPassword = await bcrypt.hash(data.password,10);
    const user = await createUser({...data,password:hashedPassword})
    const token=generateToken(user)
    return {token,user};
}

export const signin=async(data:SigninInput)=>{
    const user = await findUserByEmail(data.email);
    if(!user) throw new AppError('User not found',409);


    const isMatch = await bcrypt.compare(data.password,user.password)
    if(!isMatch) throw new AppError('Invalid Password',401)
       
    const token = generateToken(user);
    return { token,user};
}

export const resetPassword=async(data:ResetPasswordInput)=>{
    const decoded:UserJwt = jwt.verify(data.token,JWT_SECRET) as UserJwt
    const user = await findUserByEmail(decoded.email);
    if(!user) throw new AppError('Invalid token',401)
    
    const hashedPassword = await bcrypt.hash(data.newPassword,10);
    await updatePassword({
        id:user.id,
        newPassword:hashedPassword
    });

    return {message:"Password updated successfully"};
}