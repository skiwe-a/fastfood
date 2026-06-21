// ============================================================
// POST /api/likes — Lite (No Kafka)
// - Zod validation
// - Rate limiting
// - Idempotency support
// - Transaction with proper counter update
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';
import { sanitizeError } from '@/lib/error-handler';
import { likeSchema } from '@/lib/schemas';
import { withRateLimit, withIdempotency } from '@/lib/api-middleware';
import { eventBus } from '@/lib/event-bus';

async function handler(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = likeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: parsed.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const { targetType, targetId } = parsed.data;

    const existingLike = await db.like.findFirst({
      where: { userId: user.id, targetType: targetType as any, targetId },
    });

    const result = await db.$transaction(async (tx) => {
      if (existingLike) {
        await tx.like.delete({ where: { id: existingLike.id } });

        if (targetType === 'MENU_ITEM') {
          await tx.menuItem.update({ where: { id: targetId }, data: { likesCount: { decrement: 1 } } });
        } else if (targetType === 'SERVICE') {
          await tx.service.update({ where: { id: targetId }, data: { likesCount: { decrement: 1 } } });
        } else if (targetType === 'POST') {
          await tx.offerPost.update({ where: { id: targetId }, data: { likesCount: { decrement: 1 } } });
        }

        return { liked: false, message: 'تم إلغاء الإعجاب' };
      } else {
        await tx.like.create({
          data: { userId: user.id, targetType: targetType as any, targetId },
        });

        if (targetType === 'MENU_ITEM') {
          await tx.menuItem.update({ where: { id: targetId }, data: { likesCount: { increment: 1 } } });
        } else if (targetType === 'SERVICE') {
          await tx.service.update({ where: { id: targetId }, data: { likesCount: { increment: 1 } } });
        } else if (targetType === 'POST') {
          await tx.offerPost.update({ where: { id: targetId }, data: { likesCount: { increment: 1 } } });
        }

        return { liked: true, message: 'تم الإعجاب' };
      }
    });

    // Publish event (local event bus, no Kafka)
    eventBus.publish('post.liked', {
      userId: user.id,
      targetType,
      targetId,
      liked: result.liked,
    }, user.id).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    return sanitizeError(error);
  }
}

export const POST = withIdempotency(60)(withRateLimit(60, 60, { scope: 'user' })(handler));
