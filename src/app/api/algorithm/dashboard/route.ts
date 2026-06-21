// GET /api/algorithm/dashboard — بيانات لوحة تحكم الخوارزمية (للمشرف)
// Algorithm dashboard data — comprehensive daily metrics
import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayInteractions, yesterdayInteractions, weekInteractions] = await Promise.all([
      db.userInteraction.count({ where: { createdAt: { gte: today } } }),
      db.userInteraction.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      db.userInteraction.count({ where: { createdAt: { gte: lastWeek } } }),
    ]);

    const [todayByType, todayByContent] = await Promise.all([
      db.userInteraction.groupBy({ by: ['interactionType'], where: { createdAt: { gte: today } }, _count: true }),
      db.userInteraction.groupBy({ by: ['contentType'], where: { createdAt: { gte: today } }, _count: true }),
    ]);

    const watchData = await db.userInteraction.findMany({
      where: { createdAt: { gte: today }, watchDuration: { not: null, gt: 0 } },
      select: { watchDuration: true, totalDuration: true }, take: 500,
    });

    let totalWatchDuration = 0, totalContentDuration = 0, viewsOver3Sec = 0;
    for (const w of watchData) {
      totalWatchDuration += w.watchDuration || 0;
      totalContentDuration += w.totalDuration || 0;
      if (w.watchDuration && w.watchDuration >= 3) viewsOver3Sec++;
    }

    const avgWatchDuration = watchData.length > 0 ? totalWatchDuration / watchData.length : 0;
    const avgCompletionRate = totalContentDuration > 0 ? totalWatchDuration / totalContentDuration : 0;
    const irr = watchData.length > 0 ? viewsOver3Sec / watchData.length : 0;

    const activeUsersToday = await db.userInteraction.groupBy({ by: ['userId'], where: { createdAt: { gte: today } } });

    const explorationGroups = await db.explorationGroup.findMany({ select: { bucket: true } });
    const explorationCount = explorationGroups.filter(g => g.bucket === 'exploration').length;

    const topContent = await db.userInteraction.groupBy({
      by: ['contentId', 'contentType'],
      where: { createdAt: { gte: today } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // اتجاه يومي — آخر 7 أيام / Daily trend — last 7 days
    const dailyTrend: { date: string; interactions: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await db.userInteraction.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } });
      dailyTrend.push({ date: dayStart.toISOString().split('T')[0], interactions: count });
    }

    return NextResponse.json({
      summary: {
        todayInteractions, yesterdayInteractions, weekInteractions,
        changeFromYesterday: yesterdayInteractions > 0 ? ((todayInteractions - yesterdayInteractions) / yesterdayInteractions * 100).toFixed(1) : 0,
        activeUsersToday: activeUsersToday.length,
        avgWatchDuration: avgWatchDuration.toFixed(1),
        avgCompletionRate: (avgCompletionRate * 100).toFixed(1),
        irr: (irr * 100).toFixed(1),
      },
      byType: todayByType.map(t => ({ type: t.interactionType, count: t._count })),
      byContent: todayByContent.map(t => ({ type: t.contentType, count: t._count })),
      exploration: {
        explorationUsers: explorationCount,
        totalUsers: explorationGroups.length,
        rate: explorationGroups.length > 0 ? (explorationCount / explorationGroups.length * 100).toFixed(1) : 5,
      },
      topContent,
      dailyTrend,
    });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
