import redis from "../redis/redisClient";

const DASHBOARD_TTL = 300; // 5 minutes

export async function getCachedDashboard<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // CACHE LAYER REMOVED: Bypassing Redis and always fetching fresh data
  return await fetcher();
}

export async function invalidateDashboardCache(patterns: string[]): Promise<void> {
  // CACHE LAYER REMOVED: No-op
  return;
}

// Cache key builders — one per dashboard type
export const dashboardKeys = {
  sales: (userId: string) => `dashboard:sales:${userId}`,
  hr: (userId: string) => `dashboard:hr:${userId}`,
  departmentManager: (userId: string) => `dashboard:deptmgr:${userId}`,
  projectManager: (userId: string) => `dashboard:projmgr:${userId}`,
  operationExecutive: (userId: string) => `dashboard:opexec:${userId}`,
  client: (userId: string) => `dashboard:client:${userId}`,
  clientAdmin: (userId: string) => `dashboard:clientadmin:${userId}`,
  clientEstimator: (userId: string) => `dashboard:clientest:${userId}`,
  connectionDesignerAdmin: (userId: string) => `dashboard:cdadmin:${userId}`,
  generic: (userId: string, role: string) => `dashboard:generic:${role}:${userId}`,
};

// Invalidation pattern groups — which dashboards to bust when entity changes
export const invalidationPatterns = {
  onTaskChange: [
    "dashboard:deptmgr:*",
    "dashboard:projmgr:*",
    "dashboard:opexec:*",
    "dashboard:generic:*",
    "dashboard:cdadmin:*",
  ],
  onRFQChange: [
    "dashboard:sales:*",
    "dashboard:opexec:*",
    "dashboard:generic:*",
    "dashboard:clientadmin:*",
    "dashboard:clientest:*",
  ],
  onProjectChange: [
    "dashboard:projmgr:*",
    "dashboard:opexec:*",
    "dashboard:generic:*",
    "dashboard:client:*",
    "dashboard:clientadmin:*",
    "dashboard:cdadmin:*",
  ],
  onUserChange: [
    "dashboard:hr:*",
    "dashboard:generic:*",
  ],
};
