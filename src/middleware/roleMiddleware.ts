import { Request, Response, NextFunction } from 'express';
import { AppError } from '../config/utils/AppError';
import { AuthenticateRequest } from './authMiddleware';

const roleMiddleware = (requiredRole: string[]) => {
  return (req: AuthenticateRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!requiredRole.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};

export default roleMiddleware;