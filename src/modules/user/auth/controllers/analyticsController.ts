import { Response } from 'express';
import prisma from '../../../../config/database/client';

export async function getAdminAnalytics(req: any, res: Response) {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalAttempts = await prisma.loginAttempt.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    const breakdown = await prisma.loginAttempt.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    const topCountries = await prisma.loginAttempt.groupBy({
      by: ['country'],
      _count: { country: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { _count: { country: 'desc' } },
      take: 10
    });

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const suspiciousUsers: any[] = await prisma.$queryRaw`
      SELECT "userId", count(DISTINCT ip)::int as ip_count
      FROM login_attempt
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY "userId"
      HAVING count(DISTINCT ip) > 5
    `;

    // For daily logins, we'll use a simple queryRaw for PostgreSQL
    const dailyLogins = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, count(*)::int as count
      FROM login_attempt
      WHERE "createdAt" >= NOW() - INTERVAL '14 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const challengeStats = await prisma.ipChallenge.groupBy({
      by: ['action'],
      _count: { action: true },
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalAttempts,
        breakdown,
        topCountries,
        suspiciousUsersCount: suspiciousUsers.length,
        dailyLogins,
        challengeStats
      }
    });
  } catch (error) {
    console.error('Admin Analytics Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

export async function getMyLoginHistory(req: any, res: Response) {
  try {
    const userId = req.user.id;

    const history = await prisma.loginAttempt.findMany({
      where: { userId },
      include: {
        challenges: {
          select: { challengeContext: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const trustedDevices = await prisma.userTrustedIp.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        history: history.map(h => ({
          ip: h.ip,
          city: h.city,
          country: h.country,
          status: h.status,
          userAgent: h.userAgent,
          createdAt: h.createdAt,
          challengeContext: h.challenges[0]?.challengeContext || null
        })),
        trustedDevices
      }
    });
  } catch (error) {
    console.error('My Login History Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
