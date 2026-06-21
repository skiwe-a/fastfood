import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db, primaryDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

    const { targetType, targetId, score, comment } = await request.json();
    if (!targetType || !targetId || !score) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const targetIdNum = parseInt(targetId);
    const scoreNum = Math.min(5, Math.max(1, parseInt(score)));

    // [Phase 1] Use $transaction for atomic write + read-after-write consistency
    // All operations run on Primary within a single transaction
    await primaryDb.$transaction(async (tx) => {
      const existing = await tx.rating.findFirst({
        where: { userId: user.id, targetType: targetType as any, targetId: targetIdNum },
      });

      if (existing) {
        await tx.rating.update({
          where: { id: existing.id },
          data: { score: scoreNum, comment: comment || null },
        });
      } else {
        await tx.rating.create({
          data: { userId: user.id, targetType: targetType as any, targetId: targetIdNum, score: scoreNum, comment: comment || null },
        });
      }

      // Recalculate average — MUST read from same transaction (Primary)
      if (targetType === 'MENU_ITEM') {
        const agg = await tx.rating.aggregate({ where: { targetType: 'MENU_ITEM', targetId: targetIdNum }, _avg: { score: true }, _count: true });
        await tx.menuItem.update({
          where: { id: targetIdNum },
          data: { avgRating: Math.round(agg._avg.score * 10) / 10, ratingsCount: agg._count },
        });
      } else if (targetType === 'SERVICE') {
        const agg = await tx.rating.aggregate({ where: { targetType: 'SERVICE', targetId: targetIdNum }, _avg: { score: true }, _count: true });
        await tx.service.update({
          where: { id: targetIdNum },
          data: { avgRating: Math.round(agg._avg.score * 10) / 10, ratingsCount: agg._count },
        });
      }
    });

    return NextResponse.json({ message: 'تم التقييم بنجاح', score: scoreNum });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
