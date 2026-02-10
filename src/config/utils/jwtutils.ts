import jwt from 'jsonwebtoken'
import { z } from 'zod';
import { UserJwt } from '../../shared/types';

const envSchema=z.object({
    JWT_SECRET:z.string(),
});



const env =envSchema.parse(process.env);
export const JWT_SECRET = env.JWT_SECRET;

export const generateToken=(payload:UserJwt):string => {
    const options:jwt.SignOptions={expiresIn:'10h'}
    const token =jwt.sign(payload,JWT_SECRET,options);
    return token;
}
