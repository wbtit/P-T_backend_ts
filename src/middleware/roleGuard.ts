import { Response, NextFunction } from "express";
import { AuthenticateRequest } from "./authMiddleware";

export const roleGuard = (roles: string[]) => 
  (req: AuthenticateRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
