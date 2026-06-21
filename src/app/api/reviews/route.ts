import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db, primaryDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

    const { restaurantId, rating, title, content, foodRating, serviceRating, ambienceRating, valueRating } = await request.json();
    if (!restaurantId || !rating || !content) {
      return NextResponse.json({ error: 'بيانات المراجعة غير مكتملة' }, { status: 400 });
    }

    const restaurantIdNum = parseInt(restaurantId);

    // [Phase 1] Atomic transaction: create review + recalculate average
    const review = await primaryDb.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          userId: user.id,
          restaurantId: restaurantIdNum,
          rating: Math.min(5, Math.max(1, parseInt(rating))),
          title: title || null,
          content,
          foodRating: foodRating ? parseInt(foodRating) : null,
          serviceRating: serviceRating ? parseInt(serviceRating) : null,
          ambienceRating: ambienceRating ? parseInt(ambienceRating) : null,
          valueRating: valueRating ? parseInt(valueRating) : null,
        },
      });

      // Recalculate restaurant average — reads from same transaction (Primary)
      const agg = await tx.review.aggregate({ where: { restaurantId: restaurantIdNum }, _avg: { rating: true }, _count: true });
      await tx.restaurantProfile.update({
        where: { id: restaurantIdNum },
        data: { avgRating: Math.round(agg._avg.rating * 10) / 10, ratingsCount: agg._count },
      });

      return newReview;
    });

    return NextResponse.json({ message: 'تم إضافة المراجعة بنجاح', review });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
