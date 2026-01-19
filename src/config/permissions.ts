import { UserJwt } from '../shared/types';

type Role = UserJwt['role'];

type Permission = 'create' | 'read' | 'update' | 'delete';

type EntityPermissions = Record<Permission, boolean>;

type RolePermissions = Record<string, EntityPermissions>;

type PermissionsConfig = Record<Role, RolePermissions>;

// Define all entities based on the modules/routes
const entities = [
  'auth',
  'user',
  'workingHours',
  'employee',
  'fabricator',
  'department',
  'team',
  'tasks',
  'estimation',
  'comments',
  'milestone',
  'changeOrder',
  'rfq',
  'rfi',
  'project',
  'notifications',
  'agent',
  'chat',
  'client',
  'invoice',
  'connectionDesign',
  'connectionDesignerQuota',
  'submittals',
  'scores',
  'lineItems',
  'communications',
  'dashBoardData',
  'wbsTemplates',
  'vendors',
  'vendorQuota',
  'share',
  'designDrawings'
];

// Default permissions: all false, CEO can mark true as needed
const defaultEntityPermissions: EntityPermissions = {
  create: false,
  read: false,
  update: false,
  delete: false
};

const createDefaultRolePermissions = (): RolePermissions => {
  const rolePerms: RolePermissions = {};
  entities.forEach(entity => {
    rolePerms[entity] = { ...defaultEntityPermissions };
  });
  return rolePerms;
};

// Initialize permissions for all roles with defaults
export const permissions: PermissionsConfig = {
  'STAFF': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'CLIENT': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'VENDOR': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'ADMIN': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here, e.g., set some to true
  },
  'SYSTEM_ADMIN': (() => {
    const perms = createDefaultRolePermissions();
    entities.forEach(entity => {
      perms[entity] = { create: true, read: true, update: true, delete: true };
    });
    return perms;
  })(),
  'CLIENT_ADMIN': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'CONNECTION_DESIGNER_ENGINEER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'SALES_MANAGER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'SALES_PERSON': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'DEPT_MANAGER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'ESTIMATION_HEAD': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'ESTIMATOR': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'PROJECT_MANAGER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'TEAM_LEAD': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'PROJECT_MANAGER_OFFICER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'DEPUTY_MANAGER': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'OPERATION_EXECUTIVE': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  },
  'HUMAN_RESOURCE': {
    ...createDefaultRolePermissions(),
    // CEO can mark specific permissions here
  }
};

// Helper function to check if a role has a specific permission for an entity
export const hasPermission = (role: Role, entity: string, permission: Permission): boolean => {
  return permissions[role]?.[entity]?.[permission] ?? false;
};
