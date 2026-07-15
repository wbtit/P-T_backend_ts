import { UserRole } from "@prisma/client";

export function getRoleVisibilityFilter(role?: UserRole): { isConnectionDesign?: boolean } {
  if (!role) return {};

  const isClientRole = role.startsWith("CLIENT");
  const isConnectionDesignerRole =
    role === "CONNECTION_DESIGNER_ENGINEER" ||
    role === "CONNECTION_DESIGNER_ADMIN";

  if (isConnectionDesignerRole) {
    return { isConnectionDesign: true };
  }
  if (isClientRole) {
    return { isConnectionDesign: false };
  }

  return {};
}

export function getRfiSubmittalVisibilityFilter(role?: UserRole): { isConnectionDesign?: boolean; isAproovedByAdmin?: boolean } {
  const filter: any = getRoleVisibilityFilter(role);
  if (role && role.startsWith("CLIENT")) {
    filter.isAproovedByAdmin = true;
  }
  return filter;
}
