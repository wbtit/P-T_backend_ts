import { Response } from "express";
import { AuthenticateRequest } from "../../../../middleware/authMiddleware";
import prisma from "../../../../config/database/client";
import { AppError } from "../../../../config/utils/AppError";

// GET /auth/analytics/admin
export const getAdminAnalytics = async (req: AuthenticateRequest, res: Response) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Total login attempts last 30 days
  const totalAttempts30Days = await prisma.loginAttempt.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // 2. Count breakdown by status: ALLOWED, CHALLENGED, BLOCKED
  const breakdownRaw = await prisma.loginAttempt.groupBy({
    by: ["status"],
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    _count: {
      id: true,
    },
  });

  const statusBreakdown = {
    ALLOWED: 0,
    CHALLENGED: 0,
    BLOCKED: 0,
  };

  for (const item of breakdownRaw) {
    if (item.status in statusBreakdown) {
      statusBreakdown[item.status as keyof typeof statusBreakdown] = item._count.id;
    }
  }

  // 3. Top 10 countries from LoginAttempt
  const topCountriesRaw = await prisma.loginAttempt.groupBy({
    by: ["country"],
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
      country: {
        not: null,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  const topCountries = topCountriesRaw.map((item) => ({
    country: item.country || "Unknown",
    count: item._count.id,
  }));

  // 4. Suspicious users: userId with >1 distinct IP in last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentAttempts = await prisma.loginAttempt.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
      userId: {
        not: null,
      },
    },
    select: {
      userId: true,
      ip: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const userIpsMap: Record<string, { username: string; email: string | null; role: string | null; hasAllowed: boolean; ipStats: Record<string, { firstSeenAt: Date; lastSeenAt: Date }> }> = {};
  for (const attempt of recentAttempts) {
    if (!attempt.userId) continue;
    if (!userIpsMap[attempt.userId]) {
      userIpsMap[attempt.userId] = {
        username: attempt.user?.username || "unknown",
        email: attempt.user?.email || null,
        role: attempt.user?.role || null,
        hasAllowed: false,
        ipStats: {},
      };
    }
    
    if (attempt.status === "ALLOWED") {
      userIpsMap[attempt.userId].hasAllowed = true;
    }

    const ipData = userIpsMap[attempt.userId].ipStats[attempt.ip];
    if (!ipData) {
      userIpsMap[attempt.userId].ipStats[attempt.ip] = {
        firstSeenAt: attempt.createdAt,
        lastSeenAt: attempt.createdAt,
      };
    } else {
      if (attempt.createdAt < ipData.firstSeenAt) ipData.firstSeenAt = attempt.createdAt;
      if (attempt.createdAt > ipData.lastSeenAt) ipData.lastSeenAt = attempt.createdAt;
    }
  }

  const suspiciousUsers = Object.entries(userIpsMap)
    .filter(([_, data]) => data.hasAllowed && Object.keys(data.ipStats).length > 1)
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      email: data.email,
      role: data.role,
      distinctIpCount: Object.keys(data.ipStats).length,
      ips: Object.entries(data.ipStats).map(([ip, stats]) => ({
        ipAddress: ip,
        firstSeenAt: stats.firstSeenAt,
        lastSeenAt: stats.lastSeenAt,
      })),
    }));

  // 5. Daily login counts for last 14 days
  const dailyAttempts = await prisma.loginAttempt.findMany({
    where: {
      createdAt: {
        gte: fourteenDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
  });

  const dailyLoginCounts: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    dailyLoginCounts[dateStr] = 0;
  }

  for (const attempt of dailyAttempts) {
    const dateStr = attempt.createdAt.toISOString().split("T")[0];
    if (dailyLoginCounts[dateStr] !== undefined) {
      dailyLoginCounts[dateStr]++;
    }
  }

  const dailyLogins = Object.entries(dailyLoginCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 6. Challenge completion rate: APPROVED count / total CHALLENGED count
  const totalChallenges = await prisma.ipChallenge.count();
  const approvedChallenges = await prisma.ipChallenge.count({
    where: {
      action: "APPROVED",
    },
  });
  const challengeCompletionRate = totalChallenges > 0 ? approvedChallenges / totalChallenges : 0;

  res.status(200).json({
    success: true,
    data: {
      totalAttempts30Days,
      statusBreakdown,
      topCountries,
      suspiciousUsers,
      dailyLogins,
      challengeCompletionRate,
      sharedCredentialSuspectCount: suspiciousUsers.length,
    },
  });
};

// GET /auth/analytics/me
export const getMyLoginHistory = async (req: AuthenticateRequest, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }
  const userId = req.user.id;
  const now = new Date();

  // 1. Last 20 LoginAttempts for the authenticated user
  const loginAttempts = await prisma.loginAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      ip: true,
      city: true,
      country: true,
      status: true,
      userAgent: true,
      createdAt: true,
      challenges: {
        select: {
          challengeContext: true,
        },
      },
    },
  });

  const formattedHistory = loginAttempts.map((attempt) => ({
    ip: attempt.ip,
    city: attempt.city,
    country: attempt.country,
    status: attempt.status,
    userAgent: attempt.userAgent,
    createdAt: attempt.createdAt,
    challengeContext: attempt.challenges[0]?.challengeContext || null,
  }));

  // 2. List of active TrustedDevices: UserTrustedIp where isActive=true AND expiresAt > now()
  const activeTrustedDevices = await prisma.userTrustedIp.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      ipAddress: true,
      city: true,
      country: true,
      deviceFingerprint: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      loginHistory: formattedHistory,
      activeTrustedDevices,
    },
  });
};

// GET /auth/analytics/user/:userId
export const getUserRbaAnalytics = async (req: AuthenticateRequest, res: Response) => {
  const { userId } = req.params;
  const now = new Date();

  // Verify the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!targetUser) {
    throw new AppError("Target user not found", 404);
  }

  // 1. Last 50 LoginAttempts for the target user (Admins get a longer history)
  const loginAttempts = await prisma.loginAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      ip: true,
      city: true,
      country: true,
      status: true,
      userAgent: true,
      createdAt: true,
      challenges: {
        select: {
          challengeContext: true,
        },
      },
    },
  });

  const formattedHistory = loginAttempts.map((attempt) => ({
    ip: attempt.ip,
    city: attempt.city,
    country: attempt.country,
    status: attempt.status,
    userAgent: attempt.userAgent,
    createdAt: attempt.createdAt,
    challengeContext: attempt.challenges[0]?.challengeContext || null,
  }));

  // 2. Active TrustedDevices for target user
  const activeTrustedDevices = await prisma.userTrustedIp.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      ipAddress: true,
      city: true,
      country: true,
      deviceFingerprint: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      user: targetUser,
      loginHistory: formattedHistory,
      activeTrustedDevices,
    },
  });
};

// GET /auth/analytics/ip-changes
export const getIpChangeAnalytics = async (req: AuthenticateRequest, res: Response) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Fetch all active users
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  const usersWithIpChanges: any[] = [];

  // 2. Identify users whose current IP is different from their previous IP
  for (const user of activeUsers) {
    const attempts = await prisma.loginAttempt.findMany({
      where: { userId: user.id, status: "ALLOWED" },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    if (attempts.length === 2 && attempts[0].ip !== attempts[1].ip) {
      usersWithIpChanges.push({
        user,
        currentLogin: {
          ip: attempts[0].ip,
          city: attempts[0].city,
          country: attempts[0].country,
          createdAt: attempts[0].createdAt,
          loginAttemptId: attempts[0].id,
        },
        previousLogin: {
          ip: attempts[1].ip,
          city: attempts[1].city,
          country: attempts[1].country,
          createdAt: attempts[1].createdAt,
        },
      });
    }
  }

  // 3. Find active admins, deputy managers, operation executives, and HR users
  const rolesToNotify = ["ADMIN", "DEPUTY_MANAGER", "OPERATION_EXECUTIVE", "HUMAN_RESOURCE"] as any[];
  const recipientIds = await prisma.user.findMany({
    where: {
      role: { in: rolesToNotify },
      isActive: true,
    },
    select: { id: true },
  });
  const adminIds = recipientIds.map((u) => u.id);

  // 4. Fetch notifications from the last 7 days to avoid duplicate alert emails/sockets
  const existingNotifications = await prisma.notification.findMany({
    where: {
      userID: { in: adminIds },
      createdAt: { gte: sevenDaysAgo },
    },
    select: { payload: true },
  });

  const notifiedAttemptIds = new Set<string>();
  for (const notif of existingNotifications) {
    const payloadObj = notif.payload as any;
    if (payloadObj && typeof payloadObj === "object" && payloadObj.loginAttemptId) {
      notifiedAttemptIds.add(payloadObj.loginAttemptId);
    }
  }

  // 5. Send notification to the designated roles for any new IP changes
  const { notifyByRoles } = await import("../../../../utils/notifyByRole");

  for (const change of usersWithIpChanges) {
    if (!notifiedAttemptIds.has(change.currentLogin.loginAttemptId)) {
      const payload = {
        title: "User IP Change Detected",
        message: `Security Alert: User ${change.user.username} (${change.user.firstName} ${change.user.lastName}) logged in from IP ${change.currentLogin.ip} (${change.currentLogin.city || "Unknown"}, ${change.currentLogin.country || "Unknown"}). Their previous login IP was ${change.previousLogin.ip} (${change.previousLogin.city || "Unknown"}, ${change.previousLogin.country || "Unknown"}).`,
        entityType: "user",
        entityId: change.user.id,
        loginAttemptId: change.currentLogin.loginAttemptId,
      };

      // Notify the specified roles
      await notifyByRoles(rolesToNotify, payload);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      usersWithIpChanges,
    },
  });
};


// GET /auth/analytics/shared-credential-suspects
export const getSharedCredentialSuspects = async (req: AuthenticateRequest, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const attempts = await prisma.loginAttempt.findMany({
    where: {
      status: "ALLOWED",
      createdAt: {
        gte: thirtyDaysAgo,
      },
      userId: {
        not: null,
      },
    },
    select: {
      userId: true,
      ip: true,
      city: true,
      country: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const userMap: Record<string, {
    username: string;
    email: string | null;
    role: string | null;
    totalLogins: number;
    ipStats: Record<string, {
      ipAddress: string;
      city: string | null;
      country: string | null;
      firstSeenAt: Date;
      lastSeenAt: Date;
      loginCount: number;
    }>;
  }> = {};

  for (const attempt of attempts) {
    if (!attempt.userId) continue;

    if (!userMap[attempt.userId]) {
      userMap[attempt.userId] = {
        username: attempt.user?.username || "unknown",
        email: attempt.user?.email || null,
        role: attempt.user?.role || null,
        totalLogins: 0,
        ipStats: {},
      };
    }

    const userData = userMap[attempt.userId];
    userData.totalLogins++;

    if (!userData.ipStats[attempt.ip]) {
      userData.ipStats[attempt.ip] = {
        ipAddress: attempt.ip,
        city: attempt.city,
        country: attempt.country,
        firstSeenAt: attempt.createdAt,
        lastSeenAt: attempt.createdAt,
        loginCount: 1,
      };
    } else {
      const ipData = userData.ipStats[attempt.ip];
      ipData.loginCount++;
      if (attempt.createdAt < ipData.firstSeenAt) ipData.firstSeenAt = attempt.createdAt;
      if (attempt.createdAt > ipData.lastSeenAt) ipData.lastSeenAt = attempt.createdAt;
    }
  }

  const suspects = Object.entries(userMap)
    .filter(([_, data]) => Object.keys(data.ipStats).length > 1)
    .map(([userId, data]) => {
      const ipsArray = Object.values(data.ipStats).sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
      
      // firstFlaggedAt is the first time they logged in from their SECOND IP
      const firstFlaggedAt = ipsArray.length > 1 ? ipsArray[1].firstSeenAt : ipsArray[0].firstSeenAt;

      return {
        userId,
        username: data.username,
        email: data.email,
        role: data.role,
        distinctIpCount: ipsArray.length,
        ips: ipsArray,
        totalLogins: data.totalLogins,
        firstFlaggedAt,
      };
    })
    .sort((a, b) => b.distinctIpCount - a.distinctIpCount);

  res.status(200).json({
    success: true,
    data: {
      suspects,
      total: suspects.length,
      generatedAt: new Date(),
    },
  });
};
