import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../config/utils/AppError';
import { UserJwt } from '../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'youDefaultSecret';

export interface AuthenticateRequest extends Request {
  user?: UserJwt;
}

const authMiddleware = (
  req: AuthenticateRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authorization header must be provided in Bearer format', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserJwt;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401);
    }
    throw new AppError('Invalid token', 401);
  }
};

export default authMiddleware;
