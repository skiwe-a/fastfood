// ============================================================
// Platform Settings — محمي بـ requireAdmin
// PUT requires ADMIN role, GET is public (read-only)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';

// السماح فقط بهذه المفاتيح في التحديث
// Allowlist of updatable setting keys
const ALLOWED_KEYS = new Set([
  'platform_name',
  'platform_description',
  'commission_rate',
  'min_order_value',
  'max_restaurants_per_user',
  'maintenance_mode',
  'feature_stories_enabled',
  'feature_reels_enabled',
  'default_currency',
  'default_language',
  'support_email',
  'support_phone',
  'tos_url',
  'privacy_url',
]);

// القيود على نوع/حجم القيمة
// Value type/size constraints per key
const VALUE_RULES: Record<string, { type: 'string' | 'number' | 'boolean'; max?: number }> = {
  platform_name: { type: 'string', max: 100 },
  platform_description: { type: 'string', max: 1000 },
  commission_rate: { type: 'number' }, // 0..1
  min_order_value: { type: 'number' },
  max_restaurants_per_user: { type: 'number' },
  maintenance_mode: { type: 'boolean' },
  feature_stories_enabled: { type: 'boolean' },
  feature_reels_enabled: { type: 'boolean' },
  default_currency: { type: 'string', max: 10 },
  default_language: { type: 'string', max: 10 },
  support_email: { type: 'string', max: 200 },
  support_phone: { type: 'string', max: 50 },
  tos_url: { type: 'string', max: 500 },
  privacy_url: { type: 'string', max: 500 },
};

export async function GET() {
  try {
    const settings = await db.platformSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return NextResponse.json({ settings: map });
  } catch (error) {
    return sanitizeError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'الجسم يجب أن يكون object', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updates: Promise<any>[] = [];

    for (const [key, rawValue] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) {
        return NextResponse.json(
          { error: `مفتاح غير مسموح: ${key}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      const rule = VALUE_RULES[key];
      if (!rule) continue;

      // تحقق من النوع
      let value = rawValue;
      if (rule.type === 'number') {
        value = Number(rawValue);
        if (isNaN(value)) {
          return NextResponse.json(
            { error: `${key} يجب أن يكون رقم`, code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
      } else if (rule.type === 'boolean') {
        value = Boolean(rawValue);
      } else {
        value = String(rawValue);
        if (rule.max && value.length > rule.max) {
          return NextResponse.json(
            { error: `${key} تجاوز الحد الأقصى (${rule.max})`, code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
      }

      // قيود إضافية
      if (key === 'commission_rate' && (value < 0 || value > 0.5)) {
        return NextResponse.json(
          { error: 'commission_rate يجب أن يكون بين 0 و 0.5', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      if (key === 'support_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return NextResponse.json(
          { error: 'بريد دعم غير صالح', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      updates.push(
        db.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );
    }

    await Promise.all(updates);

    console.log(`[admin] ${admin.email} updated platform settings: ${Object.keys(body).join(', ')}`);

    return NextResponse.json({ success: true, updated: Object.keys(body) });
  } catch (error) {
    return sanitizeError(error);
  }
}
