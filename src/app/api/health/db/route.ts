// ============================================================
// API Route: Health Check — Lite (Single Neon Connection)
// GET /api/health/db
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return sanitizeError(error);
  }

  const timestamp = new Date().toISOString();
  const result: any = {
    status: 'healthy',
    timestamp,
    mode: 'lite',
    summary: '',
  };

  // Check Neon PostgreSQL connection
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    result.postgres = {
      status: 'connected',
      latencyMs: Date.now() - start,
    };
    result.summary = 'Neon PostgreSQL connected (Lite mode — no replicas)';
  } catch (error: any) {
    result.postgres = {
      status: 'disconnected',
      latencyMs: Date.now() - start,
      error: error.message,
    };
    result.status = 'unhealthy';
    result.summary = 'Neon PostgreSQL connection failed';
  }

  const statusCode = result.status === 'unhealthy' ? 503 : 200;
  return NextResponse.json(result, { status: statusCode });
}
