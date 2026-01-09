import { Request, Response, NextFunction } from 'express';
import { AppError } from '../config/utils/AppError';
import { AuthenticateRequest } from './authMiddleware';

const roleMiddleware = (requiredRole: string) => {
  return (req: AuthenticateRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== requiredRole) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};

export default roleMiddleware;