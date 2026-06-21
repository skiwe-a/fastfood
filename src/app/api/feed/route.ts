// ============================================================
// GET /api/feed — Hardened
// - يتحقق أولاً من الكاش المُحسوب مسبقاً (Redis L2)
// - ثم من الـ Memory cache (L1)
// - ثم يحسب مباشرة كـ fallback
// - Zod validation للـ query params
// - Rate limiting
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helper';
import { buildPersonalizedFeed } from '@/lib/algorithm/efs-engine';
import { getPrecomputedFeed } from '@/lib/algorithm/efs-worker';
import { sanitizeError } from '@/lib/error-handler';
import { withRateLimit, withCache } from '@/lib/api-middleware';
import { z } from 'zod';

const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(30),
  type: z.enum(['REEL', 'POST', 'STORY']).optional(),
});

async function handler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 1) تحقق من الـ query params
    const { searchParams } = new URL(request.url);
    const parsed = feedQuerySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 30,
      type: searchParams.get('type') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'معاملات غير صالحة', details: parsed.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const { page, limit, type: contentType } = parsed.data;

    // 2) استرجع الخلاصة (cache hierarchy)
    let items: any[] = [];
    let isExploration = false;
    let source: 'precomputed' | 'memory' | 'fresh' = 'precomputed';

    // أ) L2: Redis precomputed
    const precomputed = await getPrecomputedFeed(user.id);
    if (precomputed && precomputed.length > 0) {
      items = precomputed;
      source = 'precomputed';
    } else {
      // ب) احسب مباشرة (يستخدم L1 memory cache داخلياً)
      const result = await buildPersonalizedFeed(user.id);
      items = result.items;
      isExploration = result.isExploration;
      source = 'fresh';
    }

    // 3) فلترة حسب النوع إذا طُلب
    if (contentType) {
      items = items.filter(i => i.contentType === contentType);
    }

    // 4) Pagination
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    // 5) استجابة مع metadata
    return NextResponse.json({
      items: paginatedItems,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
      isExploration,
      source,
      cached: source === 'precomputed',
    });
  } catch (error) {
    return sanitizeError(error);
  }
}

// 200 requests per minute per user (high read endpoint)
export const GET = withRateLimit(200, 60, { scope: 'user' })(handler);
