// ============================================================
// Vercel Cron — EFS Worker
// GET /api/cron/efs-worker
// Triggered by Vercel Cron every 5 minutes
// ============================================================

import { NextResponse } from 'next/server';
import { runEfsWorker } from '@/lib/algorithm/efs-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  return true;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runEfsWorker();
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error: any) {
    console.error('[Cron] EFS Worker error:', error.message);
    return NextResponse.json(
      { error: error.message, code: 'WORKER_ERROR' },
      { status: 500 }
    );
  }
}
