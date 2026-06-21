// ============================================================
// Auth Guards — حماية مركزية للـ API routes
// Centralized Authorization Guards for API Routes
// ============================================================
// يمنع نسيان فحص الصلاحيات في endpoints الإدارية والحساسة
// Prevents forgetting permission checks on admin/sensitive endpoints
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth-helper';

// ===========================
// أنواع الأدوار / Role Types
// ===========================
export type Role = 'CUSTOMER' | 'RESTAURANT' | 'ADMIN' | 'DELIVERY';

// ===========================
// استجابة الفشل الموحّدة / Unified Failure Response
// ===========================
function forbidden(message: string = 'غير مصرح') {
  return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 });
}

function unauthorized(message: string = 'يجب تسجيل الدخول') {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}

// ===========================
// Guard: يتطلب تسجيل دخول فقط / Require authenticated user
// ===========================
export async function requireUser(req?: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) throw unauthorized();
  if (user.isFrozen) throw forbidden('الحساب مجمّد');
  return user;
}

// ===========================
// Guard: يتطلب دور مطعم / Require restaurant role
// ===========================
export async function requireRestaurant(req?: NextRequest) {
  const user = await requireUser(req);
  if (user.role !== 'RESTAURANT' && user.role !== 'ADMIN') {
    throw forbidden('هذه العملية متاحة للمطاعم فقط');
  }
  return user;
}

// ===========================
// Guard: يتطلب دور أدمن / Require admin role
// ===========================
export async function requireAdmin(req?: NextRequest) {
  const user = await requireUser(req);
  if (user.role !== 'ADMIN') {
    throw forbidden('هذه العملية متاحة للمشرفين فقط');
  }
  return user;
}

// ===========================
// Wrapper: يلتقط الأخطاء ويحوّلها إلى NextResponse
// Wrapper: catches thrown NextResponse and returns it as-is
// ===========================
export function withGuard<T extends any[]>(
  guard: (...args: T) => Promise<any>,
  handler: (user: any, req: NextRequest, ctx: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...rest: T): Promise<NextResponse> => {
    try {
      const user = await guard(req as any, ...rest.slice(1) as any);
      const ctx = rest.length > 0 ? rest[rest.length - 1] : undefined;
      return await handler(user, req, ctx);
    } catch (err: any) {
      // إذا كان NextResponse مُرمى من guard، أعِده كما هو
      if (err instanceof NextResponse) return err;
      // خطأ غير متوقع
      console.error('[withGuard] Unexpected error:', err);
      return NextResponse.json(
        { error: 'خطأ داخلي', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

// ===========================
// Helper: التحقق من ملكية المطعم / Verify restaurant ownership
// ===========================
export async function requireRestaurantOwnership(
  restaurantId: number,
  userId: number,
  userRole?: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;
  const { db } = await import('./db');
  const profile = await db.restaurantProfile.findUnique({
    where: { id: restaurantId },
    select: { userId: true },
  });
  if (!profile) throw new NextResponse(
    JSON.stringify({ error: 'المطعم غير موجود', code: 'NOT_FOUND' }),
    { status: 404 }
  );
  if (profile.userId !== userId) {
    throw new NextResponse(
      JSON.stringify({ error: 'لا تملك صلاحية على هذا المطعم', code: 'FORBIDDEN' }),
      { status: 403 }
    );
  }
  return true;
}
