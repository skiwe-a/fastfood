// حساب الإشارة الاجتماعية — يستخدم Prisma لاستعلام البيانات
// Social Signal Calculation — uses Prisma for data queries
// S = (المشاركات / (العمر + 1)) × log2(عدد المتابعين + 1) + مكافأة السرعة
// S = (interactions / (age + 1)) × log2(followers + 1) + velocity bonus

import { db } from '@/lib/db';
import { type ContentType } from './types';
import { MemoryCache, CacheKeys } from './cache';

// ===========================
// ثوابت الإشارة الاجتماعية / Social signal constants
// ===========================

/** أوزان أنواع التفاعل للإشارة الاجتماعية / Interaction type weights for social signal */
const SOCIAL_WEIGHTS = {
  likes: 1.0,       // وزن الإعجابات / Like weight
  comments: 2.5,    // التعليقات أهم / Comments are more important
  shares: 3.0,      // المشاركات الأهم / Shares are most important
  views: 0.1,       // المشاهدات الأقل أهمية / Views are least important
};

/** الحد الأقصى لعمر المحتوى لحساب السرعة (بالساعات) / Max content age for velocity calc (hours) */
const VELOCITY_WINDOW_HOURS = 12;

/** حجم نافذة "المشاركات الأخيرة" لحساب السرعة (بالساعات) / Recent shares window for velocity (hours) */
const RECENT_WINDOW_HOURS = 3;

// ===========================
// الوظائف الرئيسية / Main functions
// ===========================

/** حساب الإشارة الاجتماعية لمنشور محدد
 *  Calculate social signal for a specific content item
 *
 *  الصيغة:
 *  S = (weighted_interactions / (age_hours + 1)) × log2(follower_count + 1) + velocity_bonus
 *
 *  Formula:
 *  S = (weighted_interactions / (age_hours + 1)) × log2(follower_count + 1) + velocity_bonus
 *
 *  @param contentId معرف المحتوى / Content ID
 *  @param contentType نوع المحتوى / Content type
 *  @returns قيمة الإشارة الاجتماعية من 0 إلى 1 / Social signal value from 0 to 1
 */
export async function getSocialSignal(
  contentId: number,
  contentType: ContentType
): Promise<number> {
  const cacheKey = CacheKeys.socialSignal(contentId, contentType);
  const cached = MemoryCache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    let signal = 0;

    switch (contentType) {
      case 'POST': {
        signal = await calculatePostSocialSignal(contentId);
        break;
      }
      case 'REEL': {
        signal = await calculateReelSocialSignal(contentId);
        break;
      }
      case 'STORY': {
        signal = await calculateStorySocialSignal(contentId);
        break;
      }
    }

    // تطبيع النتيجة بين 0 و 1
    // Normalize result to 0-1 range
    const normalized = sigmoidNormalization(signal);

    // تخزين مؤقت لمدة ٥ دقائق (الإشارة الاجتماعية تتغير بسرعة معتدلة)
    // Cache for 5 minutes (social signal changes at moderate speed)
    MemoryCache.set(cacheKey, normalized, 5 * 60 * 1000);

    return normalized;
  } catch {
    // خطأ — نُرجع قيمة متوسطة
    // Error — return moderate value
    return 0.3;
  }
}

// ===========================
// حساب لكل نوع محتوى / Calculation per content type
// ===========================

/** حساب إشارة اجتماعية لمنشور (POST) / Calculate social signal for a post */
async function calculatePostSocialSignal(postId: number): Promise<number> {
  const post = await db.offerPost.findUnique({
    where: { id: postId },
    select: {
      likesCount: true,
      createdAt: true,
      restaurant: {
        select: { followersCount: true },
      },
      comments: {
        select: { createdAt: true },
      },
    },
  });

  if (!post) return 0;

  const ageHours =
    (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60) + 1;
  const followerCount = post.restaurant.followersCount;
  const commentsCount = post.comments.length;

  // حساب التعليقات الأخيرة (مكافأة السرعة)
  // Calculate recent comments (velocity bonus)
  const recentComments = post.comments.filter((c) => {
    const commentAge =
      (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60);
    return commentAge < RECENT_WINDOW_HOURS;
  }).length;

  const velocityBonus = recentComments * 0.5;

  // الصيغة: (التفاعلات الموزونة / (العمر + 1)) × log2(متابعين + 1) + مكافأة السرعة
  // Formula: (weighted_interactions / (age + 1)) × log2(followers + 1) + velocity
  const weightedInteractions =
    post.likesCount * SOCIAL_WEIGHTS.likes +
    commentsCount * SOCIAL_WEIGHTS.comments;

  const followerFactor = Math.log2(followerCount + 1);
  const rawSignal =
    (weightedInteractions / ageHours) * followerFactor + velocityBonus;

  return rawSignal;
}

/** حساب إشارة اجتماعية لريلز (REEL) / Calculate social signal for a reel */
async function calculateReelSocialSignal(reelId: number): Promise<number> {
  const reel = await db.reel.findUnique({
    where: { id: reelId },
    select: {
      likesCount: true,
      viewsCount: true,
      createdAt: true,
      restaurant: {
        select: { followersCount: true },
      },
    },
  });

  if (!reel) return 0;

  const ageHours =
    (Date.now() - reel.createdAt.getTime()) / (1000 * 60 * 60) + 1;
  const followerCount = reel.restaurant.followersCount;

  // الريلز تعتمد أكثر على المشاهدات
  // Reels rely more on views
  const weightedInteractions =
    reel.likesCount * SOCIAL_WEIGHTS.likes +
    reel.viewsCount * SOCIAL_WEIGHTS.views;

  const followerFactor = Math.log2(followerCount + 1);
  const rawSignal = (weightedInteractions / ageHours) * followerFactor;

  return rawSignal;
}

/** حساب إشارة اجتماعية لقصة (STORY) / Calculate social signal for a story */
async function calculateStorySocialSignal(storyId: number): Promise<number> {
  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      createdAt: true,
      restaurant: {
        select: { followersCount: true },
      },
    },
  });

  if (!story) return 0;

  const ageHours =
    (Date.now() - story.createdAt.getTime()) / (1000 * 60 * 60) + 1;
  const followerCount = story.restaurant.followersCount;

  // القصص تعتمد فقط على عدد المتابعين (لا توجد إعجابات مباشرة في المخطط)
  // Stories rely only on follower count (no direct likes in schema)
  const followerFactor = Math.log2(followerCount + 1);

  // مكافأة للقصص الجديدة جداً
  // Bonus for very new stories
  const freshnessBonus = ageHours < 1 ? 2.0 : ageHours < 3 ? 1.0 : 0.5;

  return followerFactor * freshnessBonus;
}

// ===========================
// حساب إشارة مجمّعة لمطعم / Aggregated signal for a restaurant
// ===========================

/** حساب متوسط الإشارة الاجتماعية لمطعم كامل
 *  Calculate average social signal for an entire restaurant */
export async function getRestaurantSocialScore(
  restaurantId: number
): Promise<number> {
  const [postCount, reelCount, storyCount] = await Promise.all([
    db.offerPost.count({ where: { restaurantId } }),
    db.reel.count({ where: { restaurantId } }),
    db.story.count({
      where: { restaurantId, expiresAt: { gt: new Date() } },
    }),
  ]);

  // حساب إشارة بسيطة بناءً على عدد المحتويات النشطة
  // Simple signal based on active content count
  const rawScore =
    postCount * 0.3 + reelCount * 0.4 + storyCount * 0.2;

  return sigmoidNormalization(rawScore);
}

// ============================================================
// ✅ MATH FIX: استبدال sigmoid بـ log normalization
// المشكلة القديمة: sigmoid(8300) ≈ 1.0 دائماً (تشبّع كامل)
// الحل: log(1 + x) / log(1 + MAX) — يحافظ على التفاضل بين القيم الكبيرة
// مثال: post بـ 100 like وآخر بـ 100k like يصبح لهما قيم مختلفة
// ============================================================
function sigmoidNormalization(x: number): number {
  if (x <= 0) return 0;

  // عتبة ديناميكية — تأخذ بعين الاعتبار نوع المحتوى
  // Dynamic threshold based on content type percentile
  // نفترض أن أقصى rawSignal للمنشورات الشعبية جداً هو ~10000
  // log(1 + 10000) ≈ 9.21
  // log(1 + 100)   ≈ 4.62  → 0.50
  // log(1 + 1000)  ≈ 6.91  → 0.75
  // log(1 + 10000) ≈ 9.21  → 1.00
  const MAX_RAW = 10000;
  const normalized = Math.log(1 + x) / Math.log(1 + MAX_RAW);

  return Math.max(0, Math.min(1, normalized));
}

/** حساب سرعة انتشار المحتوى / Calculate content spread velocity */
export async function getContentVelocity(
  contentId: number,
  contentType: ContentType
): Promise<number> {
  try {
    if (contentType === 'POST') {
      const recentComments = await db.comment.count({
        where: {
          postId: contentId,
          createdAt: {
            gte: new Date(Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000),
          },
        },
      });
      return recentComments / RECENT_WINDOW_HOURS; // تعليقات في الساعة / comments per hour
    }

    // الأنواع الأخرى لا تدعم السرعة الحالية
    // Other types don't support current velocity
    return 0;
  } catch {
    return 0;
  }
}
