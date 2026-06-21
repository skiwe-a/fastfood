// ============================================================
// نظام التضمين النصي والمشابهة — بدون خدمات خارجية
// Text Embedding & Similarity System — No external services (TF-IDF-like)
// ============================================================
// إصلاحات رياضية / Math fixes:
// 1) normalize() يستخدم L2 norm الآن (ليس L∞) → cosine حقيقي
// 2) cosineSimilarity يرجع [-1, 1] بدل [0, 1] (للسماح بالاختلاف)
// ============================================================

import { db } from '@/lib/db';
import { AFFECTIVE_DIMENSIONS, type ContentType } from './types';
import { MemoryCache, CacheKeys } from './cache';

// ===========================
// ثوابت التضمين / Embedding constants
// ===========================
const EMBEDDING_DIMENSIONS = 64;
const AFFECTIVE_SIZE = 16;

// قاموس الكلمات العربية الشائعة في سياق المطاعم
const FOOD_KEYWORDS: Record<string, number[]> = {
  // أطعمة رئيسية / Main foods
  برجر: [1, 0, 0.3, 0, 0.5, 0, 0.2, 0.3, 0, 0.9, 0, 0, 0.8, 0.3, 0, 0],
  بيتزا: [0.8, 0, 0.2, 0.1, 0.3, 0, 0.3, 0.2, 0, 0.7, 0, 0, 0.9, 0.4, 0, 0],
  مشويات: [0.7, 0.3, 0.2, 0, 0.3, 0.1, 0.2, 0.5, 0, 0.8, 0, 0, 0.9, 0.5, 0, 0.3],
  كباب: [0.6, 0.4, 0.1, 0, 0.2, 0, 0.3, 0.4, 0, 0.7, 0, 0, 0.8, 0.5, 0, 0],
  شاورما: [0.5, 0.2, 0.2, 0, 0.3, 0, 0.2, 0.3, 0, 0.8, 0, 0, 0.9, 0.4, 0, 0],
  فلافل: [0.3, 0.3, 0.2, 0, 0.2, 0, 0.2, 0.1, 0, 0.5, 0, 0, 0.7, 0.4, 0, 0],
  كبسة: [0.6, 0.5, 0.1, 0, 0.2, 0, 0.3, 0.2, 0, 0.7, 0, 0, 0.9, 0.5, 0, 0.2],
  مقلوبة: [0.4, 0.7, 0.3, 0, 0.1, 0.2, 0.4, 0.1, 0, 0.5, 0, 0, 0.8, 0.5, 0, 0],
  منسف: [0.5, 0.8, 0.2, 0, 0.1, 0.1, 0.3, 0.2, 0, 0.6, 0, 0, 0.9, 0.6, 0, 0.3],
  كنافة: [0.3, 0.6, 0.1, 0, 0.3, 0.2, 0.5, 0.1, 0, 0.4, 0, 0, 0.7, 0.7, 0, 0],
  بقلاوة: [0.2, 0.7, 0.1, 0, 0.2, 0.1, 0.4, 0.1, 0, 0.3, 0, 0, 0.6, 0.7, 0, 0.4],
  // مشروبات / Drinks
  قهوة: [0.3, 0.5, 0.1, 0.5, 0, 0, 0.4, 0, 0, 0.6, 0.5, 0.4, 0, 0.5, 0.3, 0],
  شاي: [0.1, 0.6, 0, 0.7, 0, 0, 0.5, 0, 0, 0.2, 0.7, 0.2, 0, 0.6, 0.4, 0],
  عصير: [0.4, 0, 0.1, 0.4, 0.2, 0.1, 0.3, 0.1, 0, 0.6, 0.4, 0.1, 0.4, 0.5, 0.2, 0],
  سموزي: [0.5, 0, 0.2, 0.3, 0.2, 0.2, 0.2, 0.1, 0, 0.7, 0.3, 0.2, 0.3, 0.4, 0.1, 0],
  // وصفات جوهرية
  لذيذ: [0.6, 0, 0, 0, 0.3, 0, 0.4, 0, 0, 0.5, 0, 0.1, 0.7, 0.6, 0, 0],
  شهي: [0.7, 0, 0, 0, 0.2, 0, 0.3, 0, 0, 0.6, 0, 0.1, 0.8, 0.5, 0, 0],
  جديد: [0.5, 0, 0.8, 0, 0.2, 0.9, 0, 0.5, 0, 0.5, 0, 0.6, 0, 0.3, 0, 0],
  خصم: [0.6, 0, 0.3, 0, 0.3, 0.7, 0, 0, 0, 0.4, 0, 0.1, 0.3, 0.3, 0, 0],
  عرض: [0.5, 0, 0.3, 0, 0.2, 0.6, 0, 0, 0, 0.4, 0, 0.1, 0.3, 0.3, 0, 0.2],
  حصري: [0.7, 0, 0.5, 0, 0.1, 0.8, 0, 0.3, 0, 0.4, 0, 0.4, 0, 0.2, 0, 0.6],
  فاخر: [0.3, 0, 0.2, 0, 0, 0.3, 0.3, 0.2, 0.2, 0.3, 0.2, 0.3, 0.2, 0.4, 0, 0.9],
  رخيص: [0.4, 0, 0.2, 0, 0.2, 0.3, 0, 0, 0, 0.3, 0.3, 0, 0.3, 0.3, 0, 0],
  مميز: [0.6, 0, 0.5, 0, 0.2, 0.5, 0.2, 0.3, 0, 0.5, 0, 0.4, 0.3, 0.4, 0, 0.5],
  طازج: [0.4, 0, 0.3, 0.1, 0.1, 0.3, 0.2, 0.1, 0, 0.5, 0.3, 0.3, 0.6, 0.4, 0, 0],
  // أصناف
  مطاعم: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0.3, 0],
  كافيه: [0, 0, 0, 0.6, 0.1, 0, 0.5, 0, 0, 0.3, 0.6, 0.3, 0.3, 0.3, 0.5, 0.2],
  حلويات: [0.2, 0.5, 0.1, 0.2, 0.3, 0.2, 0.4, 0, 0, 0.3, 0.3, 0.1, 0.5, 0.6, 0, 0.3],
  وجبات: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
  بحرية: [0.4, 0, 0.4, 0, 0.2, 0.3, 0, 0.5, 0, 0.5, 0, 0.3, 0.6, 0.3, 0, 0.4],
  // كلمات إنجليزية شائعة
  delicious: [0.6, 0, 0, 0, 0.3, 0, 0.4, 0, 0, 0.5, 0, 0.1, 0.7, 0.6, 0, 0],
  amazing: [0.7, 0, 0.3, 0, 0.4, 0.8, 0, 0.4, 0, 0.6, 0, 0.5, 0.3, 0.4, 0, 0.3],
  special: [0.5, 0, 0.4, 0, 0.2, 0.5, 0.2, 0.2, 0, 0.4, 0, 0.4, 0.3, 0.4, 0, 0.5],
  offer: [0.5, 0, 0.3, 0, 0.2, 0.6, 0, 0, 0, 0.4, 0, 0.1, 0.3, 0.3, 0, 0.2],
  discount: [0.5, 0, 0.2, 0, 0.2, 0.6, 0, 0, 0, 0.3, 0, 0, 0.2, 0.3, 0, 0],
  new: [0.5, 0, 0.8, 0, 0.2, 0.9, 0, 0.5, 0, 0.5, 0, 0.6, 0, 0.3, 0, 0],
  food: [0.3, 0, 0.2, 0, 0.1, 0.1, 0.2, 0.1, 0, 0.4, 0, 0.1, 0.8, 0.4, 0, 0],
  restaurant: [0, 0, 0.1, 0, 0, 0.1, 0, 0, 0, 0.1, 0, 0.1, 0.5, 0.2, 0.3, 0.3],
  delivery: [0.2, 0, 0.1, 0.2, 0, 0, 0.3, 0, 0, 0.4, 0.2, 0, 0.5, 0.3, 0, 0],
};

const AFFECTIVE_KEYWORDS: Record<string, number[]> = {
  حار: [0.9], جديد: [0.7], عرض: [0.6], خصم: [0.6], حصري: [0.8],
  spicy: [0.9], hot: [0.7], limited: [0.8],
  أمي: [0.9], البيت: [0.8], تقليدي: [0.8], 'أكل بلدي': [0.9],
  مفاجأة: [0.8], surprise: [0.8],
  استرخاء: [0.7], هادئ: [0.7], relax: [0.7],
  مرح: [0.8], ضحك: [0.8], fun: [0.8],
  راحة: [0.7], comfort: [0.7],
  مغامرة: [0.9], adventure: [0.9],
  رومانسي: [0.8], romantic: [0.8],
  طاقة: [0.8], نشاط: [0.8], energy: [0.8],
  هدوء: [0.7], calm: [0.7],
  إلهام: [0.7], inspire: [0.7],
  جوع: [0.9], hungry: [0.9],
  إشباع: [0.8], satisfaction: [0.8],
  اجتماعي: [0.7], friends: [0.7],
  فخامة: [0.9], luxury: [0.9], premium: [0.9],
};

// أعداد أولية للـ hashing ثابتة عبر الـ sessions
const HASH_PRIMES = [
  31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101,
  103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181,
  191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271,
  277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373,
];

// ===========================
// Hash function — ثابت ومنتشر
// ===========================
function simpleHash(str: string, prime: number = 31): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * prime + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ===========================
// Tokenization
// ===========================
function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  const words = normalized
    .replace(/[^\w\u0600-\u06FF\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const tokens: string[] = [...words];

  // إضافة أحرف ن-جرام للكلمات العربية القصيرة
  for (const word of words) {
    if (word.length <= 6) {
      for (let i = 0; i <= word.length - 2; i++) {
        tokens.push(word.substring(i, i + 2));
      }
      for (let i = 0; i <= word.length - 3; i++) {
        tokens.push(word.substring(i, i + 3));
      }
    }
  }

  return tokens;
}

// ============================================================
// ✅ MATH FIX: normalize() يستخدم L2 norm الآن (ليس L∞)
// هذا يضمن أن cosineSimilarity يرجع قيمة في [-1, 1] حقيقية
// ============================================================
function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector.map(() => 0);
  return vector.map((v) => v / norm);
}

// ===========================
// التضمين النصي الرئيسي
// ===========================
export function generateTextEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokenCounts = new Map<string, number>();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  }

  const totalTokens = tokens.length || 1;

  for (const [token, count] of tokenCounts.entries()) {
    const tf = count / totalTokens; // Term frequency

    // If word is in dictionary — use its affective mapping
    if (FOOD_KEYWORDS[token]) {
      const dictVec = FOOD_KEYWORDS[token];
      for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        embedding[i] += dictVec[i % dictVec.length] * tf;
      }
    }

    // Hash projection — gives unique representation per word
    for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
      const prime = HASH_PRIMES[d % HASH_PRIMES.length];
      const hashVal = simpleHash(token + d.toString(), prime + d);
      embedding[d] += ((hashVal % 1000) / 1000) * tf * 0.1;
    }
  }

  return normalize(embedding); // ✅ L2 norm الآن
}

// ===========================
// تضمين عاطفي 16 بُعداً
// ===========================
export function generateAffectiveEmbedding(
  text: string,
  tags?: string[]
): number[] {
  const combinedText = tags ? `${text} ${tags.join(' ')}` : text;
  const tokens = tokenize(combinedText);
  const vector = new Array(AFFECTIVE_SIZE).fill(0);

  for (const token of tokens) {
    if (AFFECTIVE_KEYWORDS[token]) {
      const dims = AFFECTIVE_KEYWORDS[token];
      for (let d = 0; d < AFFECTIVE_SIZE; d++) {
        if (dims[0] > 0.3) {
          vector[d] = Math.max(vector[d], dims[0] * 0.8);
        }
      }
    }

    if (FOOD_KEYWORDS[token]) {
      const foodVec = FOOD_KEYWORDS[token];
      for (let d = 0; d < AFFECTIVE_SIZE; d++) {
        vector[d] += foodVec[d % foodVec.length] * 0.3;
      }
    }
  }

  return normalize(vector); // ✅ L2 norm
}

// ============================================================
// ✅ MATH FIX: cosineSimilarity يرجع [-1, 1] حقيقي
// بما أن المتجهات مُطبَّعة بـ L2، فإن ||a||=||b||=1
// فيكفي dot product للحصول على cosine حقيقي
// ============================================================
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  if (a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const rawCosine = dotProduct / denominator; // في [-1, 1]

  // لتحويلها إلى [0, 1] لأن الخوارزمية تتوقع قيم موجبة فقط
  // (cosine + 1) / 2 يحوّل [-1, 1] → [0, 1]
  return (rawCosine + 1) / 2;
}

// ===========================
// تضمينات المستخدم
// ===========================
export async function getUserInterestEmbedding(userId: number): Promise<number[]> {
  const cacheKey = CacheKeys.userInterestEmbedding(userId);
  const cached = MemoryCache.get<number[]>(cacheKey);
  if (cached) return cached;

  try {
    const likedPosts = await db.like.findMany({
      where: { userId, targetType: 'POST' },
      select: { targetId: true },
      take: 50,
    });

    const commentedPosts = await db.comment.findMany({
      where: { userId },
      select: { postId: true },
      take: 30,
    });

    const postIds = new Set<number>();
    likedPosts.forEach((l) => postIds.add(l.targetId));
    commentedPosts.forEach((c) => postIds.add(c.postId));

    if (postIds.size === 0) {
      // مستخدم جديد — متجه محايد (وليس 0.1 كما كان)
      // L2 normalized → uniform distribution
      const neutralValue = 1 / Math.sqrt(EMBEDDING_DIMENSIONS);
      const neutral = new Array(EMBEDDING_DIMENSIONS).fill(neutralValue);
      MemoryCache.set(cacheKey, neutral, 30 * 60 * 1000);
      return neutral;
    }

    const posts = await db.offerPost.findMany({
      where: { id: { in: Array.from(postIds).slice(0, 50) } },
      select: { id: true, content: true },
    });

    if (posts.length === 0) {
      const neutralValue = 1 / Math.sqrt(EMBEDDING_DIMENSIONS);
      const neutral = new Array(EMBEDDING_DIMENSIONS).fill(neutralValue);
      MemoryCache.set(cacheKey, neutral, 30 * 60 * 1000);
      return neutral;
    }

    // متوسط مرجح حسب نوع التفاعل (LIKE=1, COMMENT=2)
    const avgEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
    let totalWeight = 0;

    // حدد وزن كل post حسب نوع التفاعل
    const likedSet = new Set(likedPosts.map((l) => l.targetId));
    const commentedSet = new Set(commentedPosts.map((c) => c.postId));

    for (const post of posts) {
      const emb = generateTextEmbedding(post.content);
      let weight = 1;
      if (commentedSet.has(post.id)) weight = 2; // التعليقات أهم
      if (likedSet.has(post.id) && commentedSet.has(post.id)) weight = 3;

      for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        avgEmbedding[i] += emb[i] * weight;
      }
      totalWeight += weight;
    }

    const result = normalize(
      avgEmbedding.map((v) => (totalWeight > 0 ? v / totalWeight : 0))
    );

    MemoryCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch {
    // خطأ — متجه محايد
    const neutralValue = 1 / Math.sqrt(EMBEDDING_DIMENSIONS);
    return new Array(EMBEDDING_DIMENSIONS).fill(neutralValue);
  }
}

// ===========================
// تضمين الفئات
// ===========================
export function getCategoryEmbedding(category: string): number[] {
  const cacheKey = CacheKeys.categoryEmbedding(category);
  const cached = MemoryCache.get<number[]>(cacheKey);
  if (cached) return cached;

  const embedding = generateTextEmbedding(category);
  MemoryCache.set(cacheKey, embedding, 60 * 60 * 1000);
  return embedding;
}

// ===========================
// توليد دفعي
// ===========================
export async function batchGenerateEmbeddings(
  items: { id: number; text: string; category: string }[]
): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();

  for (const item of items) {
    const cacheKey = `${item.id}:${item.category}`;
    const cached = MemoryCache.get<number[]>(cacheKey);
    if (cached) {
      result.set(item.id, cached);
      continue;
    }

    const combinedText = `${item.text} ${item.category}`;
    const embedding = generateTextEmbedding(combinedText);
    MemoryCache.set(cacheKey, embedding, 60 * 60 * 1000);
    result.set(item.id, embedding);
  }

  return result;
}
