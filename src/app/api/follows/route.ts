import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db, primaryDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

    const { restaurantId } = await request.json();
    if (!restaurantId) return NextResponse.json({ error: 'معرف المطعم مطلوب' }, { status: 400 });

    const restaurantIdNum = parseInt(restaurantId);

    // [Phase 1] Read from Primary for consistency
    const existing = await primaryDb.follow.findFirst({
      where: { userId: user.id, restaurantId: restaurantIdNum },
    });

    // [Phase 1] Atomic follow/unfollow + counter update
    await primaryDb.$transaction(async (tx) => {
      if (existing) {
        await tx.follow.delete({ where: { id: existing.id } });
        await tx.restaurantProfile.update({
          where: { id: restaurantIdNum },
          data: { followersCount: { decrement: 1 } },
        });
      } else {
        await tx.follow.create({ data: { userId: user.id, restaurantId: restaurantIdNum } });
        await tx.restaurantProfile.update({
          where: { id: restaurantIdNum },
          data: { followersCount: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({
      followed: !existing,
      message: existing ? 'تم إلغاء المتابعة' : 'تم المتابعة',
    });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
