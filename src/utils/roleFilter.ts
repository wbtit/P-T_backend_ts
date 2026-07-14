import { UserRole } from "@prisma/client";

export function getRoleVisibilityFilter(role?: UserRole): { isConnectionDesign?: boolean; isAproovedByAdmin?: boolean } {
  if (!role) return {};

  const isClientRole = role.startsWith("CLIENT");
  const isConnectionDesignerRole =
    role === "CONNECTION_DESIGNER_ENGINEER" ||
    role === "CONNECTION_DESIGNER_ADMIN";

  if (isConnectionDesignerRole) {
    return { isConnectionDesign: true };
  }
  if (isClientRole) {
    return { isConnectionDesign: false, isAproovedByAdmin: true };
  }
  return {}; // WBT side roles can see both (no restriction)
}
