// تلاشي الوقت غير الخطي — صيغة "التعزيز الجذري للجدة"
// Non-linear Time Decay — "Radical Novelty Boost" formula
// D = e^(-k × age^1.2)  حيث k يختلف حسب نوع المحتوى
// D = e^(-k × age^1.2) where k differs per content type

import { type ContentType, DECAY_CONSTANTS } from './types';

// ===========================
// حدود التلاشي / Decay boundaries
// ===========================

/** حدود التلاشي حسب نوع المحتوى (بالساعات)
 *  Decay boundaries per content type (in hours) */
const DECAY_THRESHOLDS: Record<ContentType, {
  /** الحد الأدنى — أقدم محتوى يُعرض / Minimum — oldest content shown */
  minAgeHours: number;
  /** نقطة البداية الكاملة — عمر الصفر = 1.0 / Full start point — age 0 = 1.0 */
  halfLifeHours: number;
}> = {
  REEL: {
    minAgeHours: 48, // الريلز يفقد قيمته بعد يومين / Reels lose value after 2 days
    halfLifeHours: 6, // يبدأ بالتلاشي بعد ٦ ساعات / Starts decaying after 6 hours
  },
  POST: {
    minAgeHours: 168, // المنشورات تدوم أسبوعاً / Posts last a week
    halfLifeHours: 24, // يبدأ بالتلاشي بعد يوم / Starts decaying after 1 day
  },
  STORY: {
    minAgeHours: 24, // القصص تنتهي خلال ٢٤ ساعة / Stories expire in 24h
    halfLifeHours: 3, // تتلاشى بسرعة / Decays quickly
  },
};

// ===========================
// حساب التلاشي الأساسي / Core decay calculation
// ===========================

/** حساب تلاشي الوقت لمنشور
 *  Calculate time decay for a content item
 *
 *  الصيغة: D = e^(-k × age^1.2)
 *  Formula: D = e^(-k × age^1.2)
 *
 *  - المحتوى الجديد (age ≈ 0) يحصل على D ≈ 1.0
 *  - New content (age ≈ 0) gets D ≈ 1.0
 *  - المحتوى القديم يتلاشى بشكل أسي غير خطي
 *  - Old content decays in a non-linear exponential fashion
 *
 *  @param contentType نوع المحتوى / Content type
 *  @param createdAt تاريخ الإنشاء / Creation date
 *  @returns قيمة التلاشي بين 0 و 1 / Decay value between 0 and 1
 */
export function calculateTimeDecay(
  contentType: ContentType,
  createdAt: Date
): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // المحتوى الذي لم يمر عليه أي وقت — أقصى نتيجة
  // Content with no age — maximum score
  if (ageHours <= 0) return 1.0;

  const threshold = DECAY_THRESHOLDS[contentType];

  // المحتوى أقدم من الحد الأدنى — لا يُعرض
  // Content older than minimum — hidden
  if (ageHours > threshold.minAgeHours) {
    return 0.01; // قيمة صغيرة جداً وليست صفر — لإمكانية الاستكشاف
    // Very small but not zero — for exploration purposes
  }

  // ثابت التلاشي k
  const k = DECAY_CONSTANTS[contentType];

  // التلاشي الأسي غير الخطي: e^(-k × age^1.2)
  // Non-linear exponential decay: e^(-k × age^1.2)
  const decay = Math.exp(-k * Math.pow(ageHours, 1.2));

  // التأكد من أن النتيجة بين 0 و 1
  // Ensure result is between 0 and 1
  return Math.max(0.01, Math.min(1.0, decay));
}

/** حساب تلاشي القصص — يعامل بشكل خاص لأنها تنتهي في ٢٤ ساعة
 *  Calculate story decay — special treatment since stories expire in 24h */
export function calculateStoryDecay(createdAt: Date, expiresAt?: Date): number {
  const now = Date.now();

  // إذا كان هناك تاريخ انتهاء محدد — نستخدمه
  // If expiration date is set — use it
  if (expiresAt) {
    const remainingMs = expiresAt.getTime() - now;
    if (remainingMs <= 0) return 0;

    // تلاشي خطي خلال فترة الصلاحية
    // Linear decay during validity period
    const totalMs = expiresAt.getTime() - createdAt.getTime();
    const remainingRatio = remainingMs / totalMs;
    return Math.max(0, Math.min(1, remainingRatio));
  }

  // افتراضي: ٢٤ ساعة من الإنشاء
  // Default: 24 hours from creation
  return calculateTimeDecay('STORY', createdAt);
}

// ===========================
// تعزيز الجدة / Novelty boost
// ===========================

/** تعزيز الجدة — يُعطي نقاط إضافية للمحتوى الجديد جداً
 *  Novelty boost — gives extra points to very new content
 *
 *  المحتوى خلال أول ساعة يحصل على تعزيز حتى 1.5x
 *  Content within the first hour gets up to 1.5x boost
 *
 *  @param createdAt تاريخ الإنشاء / Creation date
 *  @returns معامل التعزيز (1.0 إلى 1.5) / Boost multiplier (1.0 to 1.5)
 */
export function calculateNoveltyBoost(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes <= 0) return 1.5;
  if (ageMinutes >= 60) return 1.0;

  // تعزيز خطي متناقص خلال أول ساعة
  // Linearly decreasing boost during first hour
  const boost = 1.5 - (ageMinutes / 60) * 0.5;
  return Math.max(1.0, Math.min(1.5, boost));
}

/** حساب التلاشي المركب — يشمل التلاشي الأساسي + تعزيز الجدة
 *  Calculate composite decay — includes base decay + novelty boost
 *
 *  @param contentType نوع المحتوى / Content type
 *  @param createdAt تاريخ الإنشاء / Creation date
 *  @returns النتيجة النهائية للتلاشي / Final decay result (0 to 1.5)
 */
export function calculateCompositeDecay(
  contentType: ContentType,
  createdAt: Date
): number {
  if (contentType === 'STORY') {
    return calculateStoryDecay(createdAt);
  }

  const baseDecay = calculateTimeDecay(contentType, createdAt);
  const noveltyBoost = calculateNoveltyBoost(createdAt);

  // النتيجة المركبة = تلاشي أساسي × تعزيز الجدة
  // Composite result = base decay × novelty boost
  const composite = baseDecay * noveltyBoost;

  return Math.max(0.01, Math.min(1.5, composite));
}
