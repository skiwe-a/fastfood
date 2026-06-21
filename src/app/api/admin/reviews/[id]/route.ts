// ============================================================
// Admin: Delete a review (with audit log)
// محمي بـ requireAdmin
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: 'معرّف مراجعة غير صالح', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // ابحث قبل الحذف لأجل الـ audit log
    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, restaurantId: true, comment: true },
    });
    if (!review) {
      return NextResponse.json(
        { error: 'المراجعة غير موجودة', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await db.review.delete({ where: { id: reviewId } });

    console.log(
      `[admin] ${admin.email} deleted review #${reviewId} ` +
      `(user=${review.userId}, restaurant=${review.restaurantId})`
    );

    return NextResponse.json({
      message: 'تم حذف المراجعة',
      deletedId: reviewId,
    });
  } catch (error) {
    return sanitizeError(error);
  }
}
