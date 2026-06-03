import redis from "../redis/redisClient";

const DASHBOARD_TTL = 300; // 5 minutes

export async function getCachedDashboard<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (_) {}

  const data = await fetcher();

  try {
    await redis.set(key, JSON.stringify(data), { EX: DASHBOARD_TTL });
  } catch (_) {}

  return data;
}

export async function invalidateDashboardCache(patterns: string[]): Promise<void> {
  try {
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    }
  } catch (_) {}
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
