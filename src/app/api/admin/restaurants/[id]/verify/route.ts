// ============================================================
// Admin: Verify/Unverify Restaurant
// محمي بـ requireAdmin — يتطلب دور ADMIN
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    if (typeof body.isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'isVerified يجب أن يكون boolean', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const restaurantId = parseInt(id, 10);
    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: 'معرّف مطعم غير صالح', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const restaurant = await db.restaurantProfile.update({
      where: { id: restaurantId },
      data: { isVerified: body.isVerified },
      select: {
        id: true,
        restaurantName: true,
        isVerified: true,
        userId: true,
      },
    });

    console.log(`[admin] ${admin.email} ${body.isVerified ? 'verified' : 'unverified'} restaurant ${restaurantId}`);

    return NextResponse.json({
      ...restaurant,
      message: body.isVerified ? 'تم توثيق المطعم' : 'تم إلغاء توثيق المطعم',
    });
  } catch (error) {
    return sanitizeError(error);
  }
}
