import { Response } from "express";
import { AuthenticateRequest } from "./authMiddleware";

/**
 * Combined role + designation guard.
 *
 * Grants access if the authenticated user satisfies EITHER condition:
 *  1. Their UserRole is one of the authoritative roles, OR
 *  2. Their designation (case-insensitive) is one of the allowed designations.
 *
 * Usage:
 *   router.post("/", authMiddleware, roleOrDesignationGuard, ...)
 */

const AUTHORITATIVE_ROLES = [
  "ADMIN",
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "PROJECT_MANAGER_OFFICER",
  "DEPT_MANAGER",
  "DEPUTY_MANAGER",
  "OPERATION_EXECUTIVE",
  "OPERATION_EXECUTIVE_TRAINEE",
  "HUMAN_RESOURCE",
  "CONNECTION_DESIGNER_ADMIN",
  "CONNECTION_DESIGNER_ENGINEER",
  "ESTIMATION_HEAD",
  "CLIENT_ADMIN",
  "CLIENT",
];

const ALLOWED_DESIGNATIONS = ["modeler", "checker"];

export const roleOrDesignationGuard = (
  req: AuthenticateRequest,
  res: Response,
  next: Function
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const hasRole = AUTHORITATIVE_ROLES.includes(req.user.role);
  const userDesignation = (req.user.designation ?? "").toLowerCase().trim();
  const hasDesignation =
    !!userDesignation && ALLOWED_DESIGNATIONS.includes(userDesignation);

  if (!hasRole && !hasDesignation) {
    return res.status(403).json({
      message: "Forbidden: insufficient role or designation privileges",
    });
  }

  next();
};
