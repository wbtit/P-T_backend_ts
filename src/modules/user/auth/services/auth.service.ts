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
import { createUser,findUserByUsername, findUserById, findUserByIdWithPassword } from '../../repository'

type AuthUser = {
    id: string;
    email: string | null;
    username: string;
    role: string;
    connectionDesignerId?: string | null;
    departmentId?: string | null;
    password: string;
    [key: string]: unknown;
};

const toJwtPayload = (user: AuthUser): UserJwt => ({
    id: user.id,
    email: user.email,
    username: user.username,
    connectionDesignerId: user.connectionDesignerId ?? null,
    departmentId: user.departmentId ?? null,
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

// REMOVED: Self-service password reset not required for this platform.
// Admin handles password resets via PATCH /admin/users/:userId/reset-password
/*
export const forgotPassword = async (username: string) => {
    const user = await findUserByUsername(username);
    if (!user) throw new AppError('User not found', 404);

    // TODO: Set PASSWORD_RESET_SECRET separately in process.env
    const secret = process.env.PASSWORD_RESET_SECRET || JWT_SECRET;
    const token = jwt.sign(
        { userId: user.id, purpose: "password-reset" },
        secret,
        { expiresIn: "15m" }
    );
    return { token };
};

export const resetPassword=async(data:ResetPasswordInput)=>{
    // TODO: Set PASSWORD_RESET_SECRET separately in process.env
    const secret = process.env.PASSWORD_RESET_SECRET || JWT_SECRET;

    let decoded: any;
    try {
        decoded = jwt.verify(data.token, secret);
    } catch (err) {
        throw new AppError('Invalid reset token', 400);
    }

    if (!decoded || decoded.purpose !== "password-reset") {
        throw new AppError('Invalid reset token', 400);
    }

    const user = await findUserById(decoded.userId);
    if(!user) throw new AppError('Invalid reset token', 400);
    
    const hashedPassword = await bcrypt.hash(data.newPassword,10);
    await updatePassword({
        id:user.id,
        newPassword:hashedPassword
    });

    return {message:"Password updated successfully"};
}
*/

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await findUserByIdWithPassword(userId);
    if (!user) throw new AppError("User not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError("Current password is incorrect", 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updatePassword({
        id: user.id,
        newPassword: hashedPassword
    });

    return { message: "Password updated successfully" };
};
