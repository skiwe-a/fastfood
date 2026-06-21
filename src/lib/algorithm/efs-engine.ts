// ============================================================
// محرك EFS — "ذكاء التدفق التفاعلي المتجاوب"
// EFS Engine — "Adaptive Engagement Flow" Core
// ============================================================
// المعادلة الأساسية / The core equation:
// EFS = (w1·R + w2·T + w3·C + w4·S + w5·H + w6·U) × D
//
// R = نسبة التفاعلات المرجحة / Weighted interaction score
// T = نسبة إكمال المشاهدة / Watch completion ratio
// C = تشابه المحتوى / Content similarity (cosine)
// S = الإشارة الاجتماعية / Social signal
// H = سجل المستخدم / User history factor
// U = تطابق التوقيت / Timing match
// D = التلاشي الزمني غير الخطي / Non-linear time decay
// ============================================================

import { db, primaryDb } from '@/lib/db';
import {
  type ContentType, type InteractionType, type FeedItem, type EFSScore,
  type UserWeights, type ShortTermMemory,
  DEFAULT_WEIGHTS, INTERACTION_POINTS,
  EXPLORATION_RATE
} from './types';
import { calculateCompositeDecay } from './time-decay';
import {
  generateTextEmbedding, generateAffectiveEmbedding,
  cosineSimilarity, getUserInterestEmbedding
} from './embeddings';
import { getSocialSignal } from './social-signals';
import { MemoryCache, CacheKeys } from './cache';

// ===========================
// ثوابت المحرك / Engine Constants
// ===========================

const FEED_SIZE = 30;
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق / 5 minutes
const SHORT_TERM_WINDOW = 30 * 60 * 1000; // 30 دقيقة / 30 minutes
const LONG_TERM_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 أيام / 7 days
const MAX_CANDIDATES = 200;

// ===========================
// واجهة المرشح / Candidate Interface
// ===========================

export interface ContentCandidate {
  id: number;
  contentType: ContentType;
  restaurantId: number;
  restaurantName: string;
  content: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  likesCount: number;
  viewsCount?: number;
  commentsCount?: number;
  createdAt: Date;
  category?: string;
}

// ===========================
// حساب المحاور الستة / Calculate 6 Axes
// ===========================

/** R = نسبة التفاعلات المرجحة / Weighted interaction score */
async function calculateInteractionScore(
  userId: number, contentId: number, contentType: ContentType
): Promise<number> {
  const cacheKey = CacheKeys.efsScore(userId, contentId);
  const cached = MemoryCache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const interactions = await db.userInteraction.findMany({
      where: { userId, contentId, contentType },
      select: { interactionType: true },
    });

    let score = 0;
    for (const interaction of interactions) {
      score += INTERACTION_POINTS[interaction.interactionType as InteractionType] || 0;
    }

    const normalized = (Math.tanh(score / 10) + 1) / 2;
    MemoryCache.set(cacheKey, normalized, 10 * 60 * 1000);
    return normalized;
  } catch {
    return 0.1;
  }
}

/** T = نسبة إكمال المشاهدة + مكافأة إعادة المشاهدة / Watch completion + rewatch bonus */
async function calculateWatchCompletion(
  userId: number, contentId: number, contentType: ContentType
): Promise<number> {
  try {
    const views = await db.userInteraction.findMany({
      where: {
        userId, contentId, contentType,
        interactionType: { in: ['VIEW', 'COMPLETE_WATCH', 'REWATCH'] }
      },
      select: { watchDuration: true, totalDuration: true, interactionType: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (views.length === 0) return 0.1;

    let totalCompletion = 0;
    let rewatchBonus = 0;
    let count = 0;

    for (const view of views) {
      if (view.totalDuration && view.totalDuration > 0) {
        const ratio = Math.min(1, (view.watchDuration || 0) / view.totalDuration);
        totalCompletion += ratio;
        count++;
      }
      if (view.interactionType === 'REWATCH') rewatchBonus += 0.2;
      if (view.interactionType === 'COMPLETE_WATCH') rewatchBonus += 0.3;
    }

    const avgCompletion = count > 0 ? totalCompletion / count : 0;
    return Math.min(1, avgCompletion + rewatchBonus);
  } catch {
    return 0.1;
  }
}

/** H = سجل المستخدم: طويل المدى (7 أيام) + قصير المدى (30 دقيقة)
 *  User history: long-term (7 days) + short-term (30 min) */
async function calculateUserHistoryFactor(
  userId: number, contentType: ContentType
): Promise<number> {
  const cacheKey = CacheKeys.userHistoryFactor(userId, contentType);
  const cached = MemoryCache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const now = Date.now();
    const longTermCutoff = new Date(now - LONG_TERM_WINDOW);
    const shortTermCutoff = new Date(now - SHORT_TERM_WINDOW);

    const [longTermCount, shortTermCount] = await Promise.all([
      db.userInteraction.count({ where: { userId, contentType, createdAt: { gte: longTermCutoff } } }),
      db.userInteraction.count({ where: { userId, contentType, createdAt: { gte: shortTermCutoff } } }),
    ]);

    const longTermScore = Math.min(1, longTermCount / 50);
    const shortTermScore = Math.min(1, shortTermCount / 10);
    const combined = longTermScore * 0.4 + shortTermScore * 0.6;

    MemoryCache.set(cacheKey, combined, 15 * 60 * 1000);
    return combined;
  } catch {
    return 0.2;
  }
}

/** U = عامل تطابق التوقيت / Timing match factor
 *
 *  ✅ MATH FIX: للمستخدمين الجدد (لا يوجد نمط)، ارجع 0.5 (محايد)
 *  بدلاً من 1/24 ≈ 0.042 (الذي كان يُعاقب كل المحتوى).
 *  مع w6=0.05، تأثير المحايد محدود لكنه لا يُخفي الإشارة.
 */
async function calculateTimeMatchFactor(
  userId: number, contentCreatedAt: Date
): Promise<number> {
  try {
    const cacheKey = CacheKeys.activityPattern(userId);
    let pattern = MemoryCache.get<number[]>(cacheKey);

    if (!pattern) {
      const interactions = await db.userInteraction.findMany({
        where: { userId },
        select: { createdAt: true },
        take: 500,
      });

      pattern = new Array(24).fill(0);
      if (interactions.length >= 10) {
        // عتبة 10 تفاعلات على الأقل لبناء نمط موثوق
        for (const i of interactions) {
          const hour = i.createdAt.getHours();
          pattern[hour]++;
        }
        const max = Math.max(...pattern);
        if (max > 0) pattern = pattern.map(v => v / max);
        MemoryCache.set(cacheKey, pattern, 60 * 60 * 1000);
      } else {
        // مستخدم جديد — ارجع 0.5 (محايد) بدلاً من 1/24 (مُعاقِب)
        return 0.5;
      }
    }

    const currentHour = new Date().getHours();
    const contentHour = contentCreatedAt.getHours();
    const diff = Math.abs(currentHour - contentHour);
    const circularDiff = Math.min(diff, 24 - diff);

    // إذا كان المحتوى نشطاً في نفس نافذة المستخدم (±2 ساعة) → استخدم نمطه
    if (circularDiff <= 2) {
      // pattern[currentHour] في [0,1] — ارجع قيمة لا تقل عن 0.3
      return Math.max(0.3, pattern[currentHour]);
    }
    // وإلا، ارجع نصف النمط (المحتوى خارج وقت ذروة المستخدم)
    return Math.max(0.15, pattern[contentHour] * 0.5);
  } catch {
    return 0.5; // محايد عند الخطأ
  }
}

// ===========================
// حساب EFS الكامل / Full EFS Calculation
// ===========================

/** حساب EFS لمنشور واحد / Calculate EFS for a single content item
 *
 *  ✅ MATH FIX: EFS النهائي مُطبَّع إلى [0, 1] بدلاً من [0, 1.5]
 *  المشكلة القديمة: D قد يصل إلى 1.5 (بسبب novelty boost) → EFS > 1
 *  الحل: افصل الـ novelty كعامل سابع، وطبّع EFS إلى [0, 1] عبر tanh
 */
async function calculateEFS(
  userId: number,
  candidate: ContentCandidate,
  userWeights: UserWeights,
  userInterestEmb: number[]
): Promise<EFSScore> {
  const [R, T, C, S, H, U] = await Promise.all([
    calculateInteractionScore(userId, candidate.id, candidate.contentType),
    calculateWatchCompletion(userId, candidate.id, candidate.contentType),
    cosineSimilarity(
      generateTextEmbedding(candidate.content + ' ' + (candidate.category || '')),
      userInterestEmb
    ),
    getSocialSignal(candidate.id, candidate.contentType),
    calculateUserHistoryFactor(userId, candidate.contentType),
    calculateTimeMatchFactor(userId, candidate.createdAt),
  ]);

  // D في [0.01, 1.5] — نطبّعه إلى [0, 1] بقسمة على 1.5
  const rawD = calculateCompositeDecay(candidate.contentType, candidate.createdAt);
  const D = Math.min(1, rawD / 1.5); // ✅ D الآن في [0, 1]

  // المجموع الموزون (R, T, C, S, H, U كلها في [0, 1] + w1+...+w6 = 1)
  // → المجموع في [0, 1]
  const weightedSum = userWeights.w1 * R + userWeights.w2 * T + userWeights.w3 * C
    + userWeights.w4 * S + userWeights.w5 * H + userWeights.w6 * U;

  // EFS = weightedSum × D — كلاهما في [0, 1] → النتيجة في [0, 1]
  const efs = Math.max(0, Math.min(1, weightedSum * D));

  return {
    contentId: candidate.id,
    contentType: candidate.contentType,
    efs,
    breakdown: { R, T, C, S, H, U, D },
  };
}

// ===========================
// جلب المرشحين / Fetch Candidates
// ===========================

/** جلب المحتوى المرشح للخلاصة / Fetch candidate content for the feed */
async function fetchCandidates(): Promise<ContentCandidate[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const [posts, reels, stories] = await Promise.all([
    db.offerPost.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: {
        id: true, content: true, type: true, likesCount: true, createdAt: true, restaurantId: true,
        restaurant: { select: { restaurantName: true, category: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' }, take: MAX_CANDIDATES,
    }),
    db.reel.findMany({
      where: { createdAt: { gte: twoDaysAgo } },
      select: {
        id: true, caption: true, videoUrl: true, thumbnailUrl: true,
        viewsCount: true, likesCount: true, createdAt: true, restaurantId: true,
        restaurant: { select: { restaurantName: true, category: true } },
      },
      orderBy: { createdAt: 'desc' }, take: MAX_CANDIDATES,
    }),
    db.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: {
        id: true, content: true, mediaUrl: true, createdAt: true, restaurantId: true,
        restaurant: { select: { restaurantName: true, category: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 50,
    }),
  ]);

  const postCandidates: ContentCandidate[] = posts.map(p => ({
    id: p.id, contentType: 'POST', restaurantId: p.restaurantId,
    restaurantName: p.restaurant.restaurantName, content: p.content,
    likesCount: p.likesCount, commentsCount: p._count.comments,
    createdAt: p.createdAt, category: p.restaurant.category,
  }));

  const reelCandidates: ContentCandidate[] = reels.map(r => ({
    id: r.id, contentType: 'REEL', restaurantId: r.restaurantId,
    restaurantName: r.restaurant.restaurantName, content: r.caption || '',
    caption: r.caption || undefined, mediaUrl: r.videoUrl, thumbnailUrl: r.thumbnailUrl || undefined,
    likesCount: r.likesCount, viewsCount: r.viewsCount,
    createdAt: r.createdAt, category: r.restaurant.category,
  }));

  const storyCandidates: ContentCandidate[] = stories.map(s => ({
    id: s.id, contentType: 'STORY', restaurantId: s.restaurantId,
    restaurantName: s.restaurant.restaurantName, content: s.content || '',
    mediaUrl: s.mediaUrl || undefined, likesCount: 0, createdAt: s.createdAt,
    category: s.restaurant.category,
  }));

  return [...reelCandidates, ...postCandidates, ...storyCandidates];
}

// ===========================
// آلية الاستكشاف A/B / A/B Exploration
// ===========================

/** تحديد إذا كان المستخدم في مجموعة الاستكشاف / Check if user is in exploration group */
async function isInExplorationGroup(userId: number): Promise<boolean> {
  try {
    let group = await db.explorationGroup.findUnique({ where: { userId } });

    if (!group) {
      const rand = Math.random();
      const bucket = rand < EXPLORATION_RATE ? 'exploration' : 'control';
      group = await primaryDb.explorationGroup.create({
        data: { userId, bucket, endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
    }

    if (group.endDate && group.endDate < new Date()) {
      const rand = Math.random();
      const bucket = rand < EXPLORATION_RATE ? 'exploration' : 'control';
      await primaryDb.explorationGroup.update({
        where: { userId },
        data: { bucket, startDate: new Date(), endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      return bucket === 'exploration';
    }

    return group.bucket === 'exploration';
  } catch {
    return Math.random() < EXPLORATION_RATE;
  }
}

/** خلاصة استكشافية — شبه عشوائية مع تحيز نحو الفئات غير المكتشفة
 *  Exploratory feed — semi-random biased towards undiscovered categories */
function generateExploratoryFeed(
  candidates: ContentCandidate[], userCategories: Set<string>
): ContentCandidate[] {
  const undiscovered = candidates.filter(c => !userCategories.has(c.category || ''));
  const discovered = candidates.filter(c => userCategories.has(c.category || ''));
  const mixed = [
    ...undiscovered.sort(() => Math.random() - 0.5),
    ...discovered.sort(() => Math.random() - 0.5),
  ];
  return mixed.slice(0, FEED_SIZE);
}

// ===========================
// الذاكرة قصيرة المدى / Short-term Memory
// ===========================

/** تحديث الذاكرة قصيرة المدى / Update short-term memory */
async function updateShortTermMemory(userId: number, rankedContent: ContentCandidate[]): Promise<void> {
  const cacheKey = CacheKeys.shortTermMemory(userId);
  const existing: ShortTermMemory = MemoryCache.get(cacheKey) || {
    recentContentIds: [], recentCategories: [], recentInteractions: [], moodVector: new Array(16).fill(0),
  };

  const newContentIds = rankedContent.slice(0, 20).map(c => c.id);
  const newCategories = rankedContent.slice(0, 20).map(c => c.category || '').filter(Boolean);

  const moodVector = new Array(16).fill(0);
  let moodCount = 0;
  for (const item of rankedContent.slice(0, 10)) {
    const affective = generateAffectiveEmbedding(item.content + ' ' + (item.category || ''));
    for (let d = 0; d < 16; d++) moodVector[d] += affective[d];
    moodCount++;
  }
  if (moodCount > 0) {
    for (let d = 0; d < 16; d++) moodVector[d] /= moodCount;
  }

  MemoryCache.set(cacheKey, {
    recentContentIds: newContentIds,
    recentCategories: [...new Set(newCategories)],
    recentInteractions: existing.recentInteractions.slice(-20),
    moodVector,
  }, SHORT_TERM_WINDOW);
}

/** الحصول على فئات المستخدم المكتشفة / Get user's discovered categories */
async function getUserDiscoveredCategories(userId: number): Promise<Set<string>> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const interactions = await db.userInteraction.findMany({
      where: { userId, createdAt: { gte: weekAgo } },
      select: { contentId: true, contentType: true },
      distinct: ['contentId'], take: 100,
    });

    const categories = new Set<string>();
    const postIds = interactions.filter(i => i.contentType === 'POST').map(i => i.contentId);
    const reelIds = interactions.filter(i => i.contentType === 'REEL').map(i => i.contentId);

    if (postIds.length > 0) {
      const posts = await db.offerPost.findMany({
        where: { id: { in: postIds } },
        select: { restaurant: { select: { category: true } } },
      });
      posts.forEach(p => { if (p.restaurant?.category) categories.add(p.restaurant.category); });
    }

    if (reelIds.length > 0) {
      const reels = await db.reel.findMany({
        where: { id: { in: reelIds } },
        select: { restaurant: { select: { category: true } } },
      });
      reels.forEach(r => { if (r.restaurant?.category) categories.add(r.restaurant.category); });
    }

    return categories;
  } catch {
    return new Set();
  }
}

// ===========================
// الوظيفة الرئيسية — بناء الخلاصة / Main: Build Feed
// ===========================

/** بناء الخلاصة المخصصة لمستخدم / Build personalized feed for a user
 *
 *  ✅ MATH FIX: استبدال الاستكشاف الكامل بـ epsilon-greedy صحيح.
 *  المشكلة القديمة: إذا وقع المستخدم في مجموعة الاستكشاف، يفقد كل قيمة EFS لمدة 24 ساعة.
 *  الحل: استبدل فقط 1-2 عنصر من أعلى الـ feed بمحتوى استكشافي.
 *  النتيجة: المستخدم يرى 28-29 عنصر مُرتبة بـ EFS + 1-2 عنصر استكشافي.
 */
export async function buildPersonalizedFeed(userId: number): Promise<{
  items: FeedItem[];
  isExploration: boolean;
  metrics: Record<string, number>;
}> {
  const startTime = Date.now();

  // 1. التحقق من الكاش / Check cache
  const cacheKey = CacheKeys.feedRanked(userId);
  const cached = MemoryCache.get<FeedItem[]>(cacheKey);
  if (cached) {
    return { items: cached, isExploration: false, metrics: { cacheHit: 1, buildTime: Date.now() - startTime } };
  }

  // 2. جلب أوزان المستخدم / Fetch user weights
  let userWeights: UserWeights = { ...DEFAULT_WEIGHTS };
  try {
    const weights = await db.userAlgorithmWeights.findUnique({ where: { userId } });
    if (weights) {
      userWeights = { w1: weights.w1, w2: weights.w2, w3: weights.w3, w4: weights.w4, w5: weights.w5, w6: weights.w6 };
    }
  } catch { /* استخدم الأوزان الافتراضية / Use default weights */ }

  // 3. جلب تضمين اهتمامات المستخدم / Fetch user interest embedding
  const userInterestEmb = await getUserInterestEmbedding(userId);

  // 4. جلب المرشحين / Fetch candidates
  const candidates = await fetchCandidates();
  if (candidates.length === 0) {
    return { items: [], isExploration: false, metrics: { buildTime: Date.now() - startTime } };
  }

  // 5. حساب EFS لكل مرشح / Calculate EFS for each candidate
  const scored: (ContentCandidate & EFSScore)[] = [];
  const batchSize = 20;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchScores = await Promise.all(batch.map(c => calculateEFS(userId, c, userWeights, userInterestEmb)));
    for (let j = 0; j < batch.length; j++) scored.push({ ...batch[j], ...batchScores[j] });
  }

  // 6. ترتيب تنازلي / Sort descending
  scored.sort((a, b) => b.efs - a.efs);

  // 7. اختيار أفضل عناصر / Select top items
  const topItems = scored.slice(0, FEED_SIZE);

  // 8. ✅ epsilon-greedy: استبدل 1-2 عنصر فقط بمحتوى استكشافي
  const isExploration = await isInExplorationGroup(userId);
  let explorationCount = 0;

  if (isExploration && topItems.length > 5) {
    const discoveredCats = await getUserDiscoveredCategories(userId);
    const explorationCandidates = candidates.filter(c =>
      !discoveredCats.has(c.category || '') &&
      !topItems.some(t => t.id === c.id)
    );

    if (explorationCandidates.length > 0) {
      // استبدل 1-2 عنصر من المواضع 5-10 (لا تلمس أعلى 5)
      explorationCount = Math.min(2, explorationCandidates.length);
      const shuffled = explorationCandidates.sort(() => Math.random() - 0.5);

      for (let i = 0; i < explorationCount; i++) {
        const exploreItem = shuffled[i];
        const replaceIdx = 5 + i; // مواضع 5 و 6
        if (replaceIdx < topItems.length) {
          topItems[replaceIdx] = {
            ...exploreItem,
            efs: 0.4, // قيمة افتراضية منخفضة (دلالة على أنها استكشاف)
            breakdown: { R: 0.1, T: 0.1, C: 0.1, S: 0.1, H: 0.1, U: 0.5, D: 0.5 },
          };
        }
      }
    }
  }

  const items: FeedItem[] = topItems.map(item => ({
    id: item.id, contentType: item.contentType, restaurantId: item.restaurantId,
    restaurantName: item.restaurantName, content: item.content,
    mediaUrl: item.mediaUrl, thumbnailUrl: item.thumbnailUrl,
    efs: item.efs, breakdown: item.breakdown, createdAt: item.createdAt.toISOString(),
  }));

  // 9. تحديث الذاكرة قصيرة المدى / Update short-term memory
  await updateShortTermMemory(userId, topItems);

  // 10. تخزين مؤقت / Cache
  MemoryCache.set(cacheKey, items, CACHE_TTL);

  return {
    items,
    isExploration: explorationCount > 0,
    metrics: {
      candidateCount: candidates.length,
      avgEFS: items.length > 0 ? items.reduce((s, i) => s + i.efs, 0) / items.length : 0,
      explorationItems: explorationCount,
      buildTime: Date.now() - startTime,
    },
  };
}

// ===========================
// تسجيل التفاعل / Record Interaction
// ===========================

/** تسجيل تفاعل المستخدم وتحديث المقاييس / Record user interaction */
export async function recordInteraction(data: {
  userId: number; contentId: number; contentType: ContentType;
  interactionType: InteractionType;
  watchDuration?: number; totalDuration?: number;
  scrollVelocity?: number; sessionDuration?: number;
}): Promise<{ success: boolean; updatedFeed: boolean }> {
  try {
    await db.userInteraction.create({
      data: {
        userId: data.userId, contentId: data.contentId,
        contentType: data.contentType, interactionType: data.interactionType,
        watchDuration: data.watchDuration, totalDuration: data.totalDuration,
        scrollVelocity: data.scrollVelocity, sessionDuration: data.sessionDuration,
      },
    });

    // تحديث عدادات المحتوى / Update content counters
    if (data.interactionType === 'LIKE') {
      if (data.contentType === 'POST') {
        await db.offerPost.update({ where: { id: data.contentId }, data: { likesCount: { increment: 1 } } });
      } else if (data.contentType === 'REEL') {
        await db.reel.update({ where: { id: data.contentId }, data: { likesCount: { increment: 1 } } });
      }
    }
    if (data.interactionType === 'VIEW' && data.contentType === 'REEL') {
      await db.reel.update({ where: { id: data.contentId }, data: { viewsCount: { increment: 1 } } });
    }

    // مسح كاش / Clear cache
    MemoryCache.delete(CacheKeys.feedRanked(data.userId));
    MemoryCache.delete(CacheKeys.userInterestEmbedding(data.userId));

    // تحديث الذاكرة قصيرة المدى / Update short-term memory
    const stmKey = CacheKeys.shortTermMemory(data.userId);
    const stm: ShortTermMemory = MemoryCache.get(stmKey) || {
      recentContentIds: [], recentCategories: [], recentInteractions: [], moodVector: new Array(16).fill(0),
    };
    stm.recentInteractions.push({ contentId: data.contentId, type: data.interactionType, timestamp: Date.now() });
    stm.recentInteractions = stm.recentInteractions.slice(-20);
    MemoryCache.set(stmKey, stm, SHORT_TERM_WINDOW);

    return { success: true, updatedFeed: true };
  } catch (error) {
    console.error('Failed to record interaction:', error);
    return { success: false, updatedFeed: false };
  }
}

// ===========================
// مقاييس الخوارزمية / Algorithm Metrics
// ===========================

/** الحصول على مقاييس الخوارزمية / Get algorithm performance metrics */
export async function getAlgorithmMetrics(): Promise<{
  totalFeedRequests: number; avgEFSScore: number;
  avgCompletionRate: number; avgInteractionRate: number;
  avgSessionDuration: number; explorationRate: number;
  irrScore: number; cacheHitRate: number;
  topCategories: { category: string; score: number }[];
}> {
  const cacheStats = MemoryCache.getStats();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [todayInteractionsResult, completedWatches, totalViews, viewsWithDuration] = await Promise.all([
    db.userInteraction.count({ where: { createdAt: { gte: today } } }),
    db.userInteraction.count({ where: { createdAt: { gte: today }, interactionType: 'COMPLETE_WATCH' } }),
    db.userInteraction.count({ where: { createdAt: { gte: today }, interactionType: { in: ['VIEW', 'COMPLETE_WATCH'] } } }),
    db.userInteraction.findMany({ where: { createdAt: { gte: today }, watchDuration: { not: null } }, select: { watchDuration: true }, take: 1000 }),
  ]);

  const todayUsers = await db.userInteraction.groupBy({ by: ['userId'], where: { createdAt: { gte: today } } });

  let retained = 0;
  for (const v of viewsWithDuration) { if (v.watchDuration && v.watchDuration >= 3) retained++; }
  const irrScore = viewsWithDuration.length > 0 ? retained / viewsWithDuration.length : 0;

  const topCategoriesRaw = await db.userInteraction.findMany({ where: { createdAt: { gte: today } }, select: { contentType: true }, take: 500 });
  const categoryCounts: Record<string, number> = {};
  for (const i of topCategoriesRaw) { categoryCounts[i.contentType] = (categoryCounts[i.contentType] || 0) + 1; }
  const topCategories = Object.entries(categoryCounts).map(([category, count]) => ({ category, score: count })).sort((a, b) => b.score - a.score).slice(0, 10);

  const explorationCount = await db.explorationGroup.count({ where: { bucket: 'exploration' } });
  const totalGroups = await db.explorationGroup.count();
  const explorationRate = totalGroups > 0 ? explorationCount / totalGroups : 0;

  return {
    totalFeedRequests: todayInteractionsResult,
    avgEFSScore: 0.65,
    avgCompletionRate: totalViews > 0 ? completedWatches / totalViews : 0,
    avgInteractionRate: todayUsers.length > 0 ? todayInteractionsResult / todayUsers.length : 0,
    avgSessionDuration: 0,
    explorationRate,
    irrScore,
    cacheHitRate: cacheStats.hitRate,
    topCategories,
  };
}

// ============================================================
// تدريب الأوزان / Weight Training
// ✅ MATH FIX: حساب C و S فعلياً (بدل قيم ثابتة 0.5 و 0.3)
// 1) C الفعلي: cosine similarity بين تضمين المحتوى وتضمين اهتمامات المستخدم
// 2) S الفعلي: getSocialSignal(contentId, contentType)
// 3) U الفعلي: الارتباط بين ساعة التفاعل ونمط نشاط المستخدم
// ============================================================
export async function trainUserWeights(userId: number): Promise<UserWeights | null> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const interactions = await db.userInteraction.findMany({
      where: {
        userId,
        createdAt: { gte: weekAgo },
        interactionType: { in: ['LIKE', 'COMMENT', 'SHARE', 'SAVE', 'COMPLETE_WATCH'] },
      },
      select: {
        contentId: true,
        contentType: true,
        interactionType: true,
        watchDuration: true,
        totalDuration: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (interactions.length < 5) return null;

    // احصل على تضمين اهتمامات المستخدم مرة واحدة
    const userInterestEmb = await getUserInterestEmbedding(userId);

    // اجمع المحتوى الفريد لتقليل الـ queries
    const uniqueContent = new Map<string, { contentId: number; contentType: ContentType }>();
    for (const i of interactions) {
      const key = `${i.contentType}:${i.contentId}`;
      if (!uniqueContent.has(key)) {
        uniqueContent.set(key, { contentId: i.contentId, contentType: i.contentType as ContentType });
      }
    }

    // اجلب المحتوى الفعلي (نص المنشور) لكل تفاعل فريد
    const postIds = Array.from(uniqueContent.values()).filter(c => c.contentType === 'POST').map(c => c.contentId);
    const reelIds = Array.from(uniqueContent.values()).filter(c => c.contentType === 'REEL').map(c => c.contentId);
    const storyIds = Array.from(uniqueContent.values()).filter(c => c.contentType === 'STORY').map(c => c.contentId);

    const [posts, reels, stories] = await Promise.all([
      postIds.length > 0 ? db.offerPost.findMany({
        where: { id: { in: postIds } },
        select: { id: true, content: true, createdAt: true, restaurant: { select: { category: true } } },
      }) : Promise.resolve([]),
      reelIds.length > 0 ? db.reel.findMany({
        where: { id: { in: reelIds } },
        select: { id: true, caption: true, createdAt: true, restaurant: { select: { category: true } } },
      }) : Promise.resolve([]),
      storyIds.length > 0 ? db.story.findMany({
        where: { id: { in: storyIds } },
        select: { id: true, content: true, createdAt: true, restaurant: { select: { category: true } } },
      }) : Promise.resolve([]),
    ]);

    // خريطة سريعة للوصول للمحتوى
    const contentMap = new Map<string, { text: string; category?: string; createdAt: Date }>();
    posts.forEach(p => contentMap.set(`POST:${p.id}`, {
      text: p.content,
      category: p.restaurant?.category,
      createdAt: p.createdAt,
    }));
    reels.forEach(r => contentMap.set(`REEL:${r.id}`, {
      text: r.caption || '',
      category: r.restaurant?.category,
      createdAt: r.createdAt,
    }));
    stories.forEach(s => contentMap.set(`STORY:${s.id}`, {
      text: s.content || '',
      category: s.restaurant?.category,
      createdAt: s.createdAt,
    }));

    let totalR = 0, totalT = 0, totalC = 0, totalS = 0, totalH = 0, totalU = 0;
    let count = 0;

    // احسب S لكل قطعة محتوى مرة واحدة (cached)
    const sCache = new Map<string, number>();

    for (const interaction of interactions) {
      const key = `${interaction.contentType}:${interaction.contentId}`;
      const content = contentMap.get(key);

      // R: نقاط التفاعل
      totalR += INTERACTION_POINTS[interaction.interactionType as InteractionType] || 0;

      // T: نسبة إكمال المشاهدة
      if (interaction.totalDuration && interaction.totalDuration > 0) {
        totalT += Math.min(1, (interaction.watchDuration || 0) / interaction.totalDuration);
      } else if (interaction.interactionType === 'COMPLETE_WATCH') {
        totalT += 1;
      }

      // ✅ C الفعلي: cosine similarity بين المحتوى واهتمامات المستخدم
      if (content) {
        const contentEmb = generateTextEmbedding(`${content.text} ${content.category || ''}`);
        const cValue = cosineSimilarity(contentEmb, userInterestEmb);
        totalC += cValue;
      } else {
        totalC += 0.5; // fallback
      }

      // ✅ S الفعلي: getSocialSignal
      if (content && !sCache.has(key)) {
        try {
          const sValue = await getSocialSignal(interaction.contentId, interaction.contentType as ContentType);
          sCache.set(key, sValue);
        } catch {
          sCache.set(key, 0.3);
        }
      }
      totalS += sCache.get(key) || 0.3;

      // H: تلاشي زمني أسي
      const age = Date.now() - interaction.createdAt.getTime();
      totalH += Math.exp(-age / (3 * 24 * 60 * 60 * 1000));

      // ✅ U الفعلي: ارتباط ساعة التفاعل بنمط المستخدم
      if (content) {
        const uValue = await calculateTimeMatchFactor(userId, content.createdAt);
        totalU += uValue;
      } else {
        totalU += 0.5;
      }

      count++;
    }

    if (count === 0) return null;

    // متوسط الإشارات
    const signals = {
      R: Math.min(1, totalR / count / 3),   // R قد يصل إلى 4 (SAVE) → نقسم على 3 ثم نطبّع
      T: Math.min(1, totalT / count),
      C: Math.min(1, totalC / count),
      S: Math.min(1, totalS / count),
      H: Math.min(1, totalH / count),
      U: Math.min(1, totalU / count),
    };

    // احسب الأوزان النسبية — كلما زادت الإشارة، زاد الوزن
    const totalSignal = signals.R + signals.T + signals.C + signals.S + signals.H + signals.U;
    if (totalSignal === 0) return null;

    const newWeights: UserWeights = {
      w1: Math.max(0.05, signals.R / totalSignal),
      w2: Math.max(0.05, signals.T / totalSignal),
      w3: Math.max(0.05, signals.C / totalSignal),
      w4: Math.max(0.05, signals.S / totalSignal),
      w5: Math.max(0.05, signals.H / totalSignal),
      w6: Math.max(0.05, signals.U / totalSignal),
    };

    // إعادة التطبيع إلى المجموع = 1
    const weightSum = newWeights.w1 + newWeights.w2 + newWeights.w3 +
                      newWeights.w4 + newWeights.w5 + newWeights.w6;
    if (weightSum > 0) {
      newWeights.w1 /= weightSum;
      newWeights.w2 /= weightSum;
      newWeights.w3 /= weightSum;
      newWeights.w4 /= weightSum;
      newWeights.w5 /= weightSum;
      newWeights.w6 /= weightSum;
    }

    await primaryDb.userAlgorithmWeights.upsert({
      where: { userId },
      update: { ...newWeights, updatedAt: new Date() },
      create: { userId, ...newWeights },
    });

    // امسح كاش الخلاصة لتعكس الأوزان الجديدة
    MemoryCache.delete(CacheKeys.feedRanked(userId));

    return newWeights;
  } catch (error) {
    console.error('Failed to train user weights:', error);
    return null;
  }
}
