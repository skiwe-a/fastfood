// ============================================================
// Admin: Update/Delete user — hardened
// - محمي بـ requireAdmin
// - bcrypt 12 rounds
// - Zod validation
// - audit log
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db, primaryDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';
import { BCRYPT_ROUNDS } from '@/lib/auth';
import { adminUserUpdateSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'معرّف غير صالح', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'بيانات غير صالحة',
          details: parsed.error.flatten().fieldErrors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { restaurantProfile: { select: { id: true } } },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // منع تعديل أدمن آخر (إلا super-admin)
    if (user.role === 'ADMIN' && admin.id !== userId) {
      return NextResponse.json(
        { error: 'لا يمكن تعديل حساب مدير آخر', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFrozen !== undefined) updateData.isFrozen = data.isFrozen;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    // تحديث حالة المطعم بشكل متزامن
    if (user.restaurantProfile) {
      const profileUpdate: any = {};
      if (data.isActive !== undefined) profileUpdate.isActive = data.isActive;
      if (data.isVerified !== undefined) profileUpdate.isVerified = data.isVerified;
      if (Object.keys(profileUpdate).length > 0) {
        await primaryDb.restaurantProfile.update({
          where: { userId },
          data: profileUpdate,
        });
      }
    }

    const updated = await primaryDb.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        restaurantProfile: {
          select: {
            id: true,
            restaurantName: true,
            isActive: true,
            isVerified: true,
          },
        },
        _count: { select: { reviews: true, likes: true } },
      },
    });

    console.log(
      `[admin] ${admin.email} updated user #${userId}: ${Object.keys(updateData).join(', ')}`
    );

    // لا تُرجع كلمة المرور
    const { password, ...safeUser } = updated as any;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return sanitizeError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'معرّف غير صالح', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'لا يمكن حذف حساب المدير', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Soft delete بدلاً من hard delete (إذا أمكن)
    await primaryDb.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        isFrozen: true,
        // إخفاء الـ email بإعادة تسميته حتى يمكن إعادة استخدام الإيميل
        email: `deleted+${userId}_${user.email}`,
      },
    });

    console.log(`[admin] ${admin.email} soft-deleted user #${userId} (${user.email})`);

    return NextResponse.json({ success: true, message: 'تم تعطيل الحساب' });
  } catch (error) {
    return sanitizeError(error);
  }
}
