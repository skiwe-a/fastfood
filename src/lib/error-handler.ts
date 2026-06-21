// ============================================================
// Error Handler — تطبيع الأخطاء واقتطاع المعلومات الحساسة
// Unified error handler — sanitizes sensitive info from responses
// ============================================================

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// ===========================
// قائمة الرسائل الموثوقة / Allow-listed messages
// ===========================
const SAFE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'يجب تسجيل الدخول',
  FORBIDDEN: 'غير مصرح',
  NOT_FOUND: 'غير موجود',
  VALIDATION_ERROR: 'بيانات غير صالحة',
  RATE_LIMITED: 'تجاوز الحد المسموح',
  CONFLICT: 'تعارض في البيانات',
};

// ===========================
// sanitizeError — يحوّل أي thrown error إلى استجابة آمنة
// sanitizeError — converts any thrown error to a safe response
// ===========================
export function sanitizeError(error: unknown): NextResponse {
  // 1) إذا كان NextResponse مُرمى من guard، أعِده كما هو
  if (error instanceof NextResponse) return error;

  // 2) أخطاء Prisma المعروفة
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // unique constraint violation
        return NextResponse.json(
          { error: 'القيمة موجودة مسبقاً', code: 'CONFLICT' },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          { error: 'السجل غير موجود', code: 'NOT_FOUND' },
          { status: 404 }
        );
      case 'P2003':
        return NextResponse.json(
          { error: 'مرجع غير صالح', code: 'FOREIGN_KEY_VIOLATION' },
          { status: 400 }
        );
      default:
        console.error('[DB] Prisma error', error.code, error.message);
        return NextResponse.json(
          { error: 'خطأ في قاعدة البيانات', code: 'DB_ERROR' },
          { status: 400 }
        );
    }
  }

  // 3) أخطاء Prisma غير المعروفة (اتصال، timeout)
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('[DB] Unknown Prisma error:', error.message);
    return NextResponse.json(
      { error: 'خطأ في قاعدة البيانات', code: 'DB_ERROR' },
      { status: 503 }
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[DB] Connection error:', error.message);
    return NextResponse.json(
      { error: 'الخدمة غير متاحة حالياً', code: 'SERVICE_UNAVAILABLE' },
      { status: 503 }
    );
  }

  // 4) Error عادي مع message
  if (error instanceof Error) {
    // قد يكون message يحتوي على معلومات حساسة (Prisma raw errors)
    // فقط ارجع الرسالة إذا كانت قصيرة وعربية (دلالة على رسالة عمل)
    const msg = error.message;
    if (msg.length < 200 && /[\u0600-\u06FF]/.test(msg)) {
      return NextResponse.json(
        { error: msg, code: 'BUSINESS_ERROR' },
        { status: 400 }
      );
    }
    console.error('[API] Unexpected error:', msg);
  }

  // 5) Fallback — لا تكشف أي شيء
  console.error('[API] Unknown error type:', error);
  return NextResponse.json(
    { error: 'خطأ داخلي في الخادم', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

// ===========================
// sanitizeMessage — للاستخدام داخل responses
// ===========================
export function sanitizeMessage(msg: unknown): string {
  if (typeof msg !== 'string') return 'خطأ غير معروف';
  if (msg.length > 200) return 'خطأ في المعالجة';
  // امنع أي شيء يحتوي على مسارات ملفات أو SQL
  if (/\/[a-z]+\/[a-z]+/i.test(msg)) return 'خطأ في المعالجة';
  if (/select|insert|update|delete|drop|alter\s+/i.test(msg)) return 'خطأ في المعالجة';
  return msg;
}
