// ============================================================
// EFS Background Worker — Lite (No Kafka)
// Pre-compute feed for active users — uses Redis only
// ============================================================

import { db } from '@/lib/db';
import { redisCache } from '@/lib/redis';
import { buildPersonalizedFeed } from './efs-engine';

const ACTIVE_USER_WINDOW_HOURS = 24;
const FEED_TTL_SECONDS = 300; // 5 minutes
const BATCH_SIZE = 50;
const MAX_CONCURRENT_USERS = 10;
const PRECOMPUTE_CACHE_KEY = (userId: number) => `feed:precomputed:${userId}`;

async function getActiveUsers(): Promise<number[]> {
  const cutoff = new Date(Date.now() - ACTIVE_USER_WINDOW_HOURS * 60 * 60 * 1000);
  const result = await db.userInteraction.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: cutoff } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1000,
  });
  return result.map((r: any) => r.userId);
}

async function precomputeForUser(userId: number): Promise<{ success: boolean; itemCount: number; duration: number }> {
  const start = Date.now();
  try {
    const result = await buildPersonalizedFeed(userId);
    if (result.items.length > 0) {
      await redisCache.set(
        PRECOMPUTE_CACHE_KEY(userId),
        result.items,
        FEED_TTL_SECONDS
      );
    }
    return {
      success: true,
      itemCount: result.items.length,
      duration: Date.now() - start,
    };
  } catch (err: any) {
    console.error(`[EFS-Worker] Failed for user ${userId}:`, err.message);
    return { success: false, itemCount: 0, duration: Date.now() - start };
  }
}

async function processBatch(userIds: number[]): Promise<{ total: number; success: number; failed: number; avgDuration: number }> {
  let success = 0;
  let failed = 0;
  let totalDuration = 0;

  for (let i = 0; i < userIds.length; i += MAX_CONCURRENT_USERS) {
    const batch = userIds.slice(i, i + MAX_CONCURRENT_USERS);
    const results = await Promise.all(batch.map(precomputeForUser));

    for (const r of results) {
      if (r.success) success++;
      else failed++;
      totalDuration += r.duration;
    }
  }

  return {
    total: userIds.length,
    success,
    failed,
    avgDuration: userIds.length > 0 ? totalDuration / userIds.length : 0,
  };
}

export async function runEfsWorker(): Promise<{
  processed: number;
  success: number;
  failed: number;
  avgDuration: number;
  totalDuration: number;
}> {
  console.log('[EFS-Worker] Starting pre-computation cycle...');
  const start = Date.now();

  try {
    const activeUsers = await getActiveUsers();
    console.log(`[EFS-Worker] Found ${activeUsers.length} active users`);

    if (activeUsers.length === 0) {
      return { processed: 0, success: 0, failed: 0, avgDuration: 0, totalDuration: 0 };
    }

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    let processed = 0;

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      const result = await processBatch(batch);
      totalSuccess += result.success;
      totalFailed += result.failed;
      totalDuration += result.avgDuration * result.total;
      processed += result.total;
    }

    const avgDuration = processed > 0 ? totalDuration / processed : 0;

    console.log(
      `[EFS-Worker] Done in ${Date.now() - start}ms. ` +
      `Processed=${processed}, Success=${totalSuccess}, Failed=${totalFailed}`
    );

    return {
      processed,
      success: totalSuccess,
      failed: totalFailed,
      avgDuration,
      totalDuration: Date.now() - start,
    };
  } catch (err: any) {
    console.error('[EFS-Worker] Fatal error:', err.message);
    return {
      processed: 0, success: 0, failed: 0, avgDuration: 0, totalDuration: Date.now() - start,
    };
  }
}

// Kafka consumer stub — disabled in Lite
export async function startInteractionConsumer(): Promise<void> {
  console.log('[EFS-Worker] Kafka consumer disabled in Lite mode');
}

export async function getPrecomputedFeed(userId: number): Promise<any[] | null> {
  try {
    return await redisCache.get<any[]>(PRECOMPUTE_CACHE_KEY(userId));
  } catch {
    return null;
  }
}
