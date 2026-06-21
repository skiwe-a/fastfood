// ============================================================
// /api/health — Lite Health Check
// يفحص PostgreSQL + Redis + Supabase Storage فقط
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redisCache } from '@/lib/redis';
import { storageService } from '@/lib/storage';
import { circuitBreakerRegistry } from '@/lib/circuit-breaker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CHECK_TIMEOUT_MS = 3000;

async function withTimeout<T>(promise: Promise<T>, ms: number = CHECK_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms`)), ms)
    ),
  ]);
}

async function checkPostgres(): Promise<{ status: string; latencyMs: number; details?: any }> {
  const start = Date.now();
  try {
    await withTimeout(db.$queryRaw`SELECT 1`);
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'unhealthy', latencyMs: Date.now() - start, details: err.message };
  }
}

async function checkRedis(): Promise<{ status: string; latencyMs: number; details?: any }> {
  const start = Date.now();
  try {
    await withTimeout(redisCache.set('__health_check__', '1', 5));
    await withTimeout(redisCache.del('__health_check__'));
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'degraded', latencyMs: Date.now() - start, details: err.message };
  }
}

function checkSystem() {
  const memUsage = process.memoryUsage();
  return {
    status: 'healthy',
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    uptime: `${Math.round(process.uptime())}s`,
    node: process.version,
  };
}

export async function GET() {
  const start = Date.now();

  const [postgres, redis, system] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    Promise.resolve(checkSystem()),
  ]);

  const checks = { postgres, redis, system };
  const overall = postgres.status === 'healthy' ? 'healthy' : 'unhealthy';
  const totalLatencyMs = Date.now() - start;

  const breakerStats = circuitBreakerRegistry.getAllStats();

  const response = {
    status: overall,
    timestamp: new Date().toISOString(),
    totalLatencyMs,
    checks,
    circuitBreakers: breakerStats,
    version: '1.0.0-lite',
    environment: process.env.NODE_ENV || 'development',
    mode: 'lite',
  };

  const httpStatus = overall === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Status': overall,
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
