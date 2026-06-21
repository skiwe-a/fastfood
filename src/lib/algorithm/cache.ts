// ذاكرة مؤقتة داخلية — بديل لـ Redis
// In-memory cache with TTL — Redis replacement for FASTfood EFS

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

interface SortedSetMember {
  member: string;
  score: number;
}

// تنسيق مفاتيح الكاش
// Cache key format helpers
export const CacheKeys = {
  efsScore: (userId: number, contentId: number) =>
    `efs:score:${userId}:${contentId}`,
  efsFeed: (userId: number, contentType: string) =>
    `efs:feed:${userId}:${contentType}`,
  userWeights: (userId: number) => `efs:weights:${userId}`,
  embedding: (contentId: number, contentType: string) =>
    `efs:emb:${contentType}:${contentId}`,
  userInterestEmbedding: (userId: number) => `efs:interest:${userId}`,
  socialSignal: (contentId: number, contentType: string) =>
    `efs:social:${contentType}:${contentId}`,
  shortTermMemory: (userId: number) => `efs:stm:${userId}`,
  userHistoryFactor: (userId: number, contentType: string) =>
    `efs:history:${userId}:${contentType}`,
  activityPattern: (userId: number) => `efs:activity:${userId}`,
  categoryEmbedding: (category: string) => `efs:cat:${category}`,
  feedRanked: (userId: number) => `efs:ranked:${userId}`,
} as const;

export class MemoryCache {
  // تخزين القيم البسيطة مع صلاحية زمنية
  // Simple key-value store with TTL
  private static store = new Map<string, CacheEntry>();
  // تخزين المجموعات المرتبة (مثل Redis Sorted Set)
  // Sorted-set store (similar to Redis Sorted Set)
  private static sortedSets = new Map<string, SortedSetMember[]>();
  // مؤقت التنظيف التلقائي
  // Auto-cleanup timer
  private static cleanupTimer: ReturnType<typeof setInterval> | null = null;
  // عدد الإدخالات المنتهية الصلاحية
  // Count of expired entries removed
  private static stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  // ===========================
  // عمليات القيم البسيطة / Simple value operations
  // ===========================

  /** استرجاع قيمة من الكاش / Get a value from cache */
  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    this.stats.hits++;
    return entry.value as T;
  }

  /** تخزين قيمة مع صلاحية زمنية / Store a value with TTL */
  static set(key: string, value: unknown, ttlMs: number): void {
    // تنظيف القديم إذا وُجد
    // Clean up old entry if exists
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /** حذف مفتاح محدد / Delete a specific key */
  static delete(key: string): void {
    this.store.delete(key);
    this.sortedSets.delete(key);
  }

  /** التحقق من وجود مفتاح / Check if a key exists */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** مسح كل الكاش / Clear all cache */
  static clear(): void {
    this.store.clear();
    this.sortedSets.clear();
  }

  // ===========================
  // عمليات المجموعات المرتبة / Sorted-set operations
  // ===========================

  /** إضافة عضو إلى مجموعة مرتبة / Add member to sorted set */
  static addToSortedSet(key: string, member: string, score: number): void {
    let set = this.sortedSets.get(key);
    if (!set) {
      set = [];
      this.sortedSets.set(key, set);
    }
    // تحديث النتيجة إذا كان العضو موجوداً
    // Update score if member already exists
    const existingIndex = set.findIndex((m) => m.member === member);
    if (existingIndex >= 0) {
      set[existingIndex].score = score;
    } else {
      set.push({ member, score });
    }
    // ترتيب تنازلي (الأعلى أولاً)
    // Sort descending (highest first)
    set.sort((a, b) => b.score - a.score);
  }

  /** استرجاع نطاق من مجموعة مرتبة (مرتبة تنازلياً) / Get range from sorted set */
  static getSortedSetRange(
    key: string,
    start: number,
    end: number
  ): SortedSetMember[] {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    return set.slice(start, end + 1);
  }

  /** استرجاع نتيجة عضو محدد / Get score of a specific member */
  static getSortedSetScore(key: string, member: string): number | null {
    const set = this.sortedSets.get(key);
    if (!set) return null;
    const item = set.find((m) => m.member === member);
    return item ? item.score : null;
  }

  /** حذف عضو من مجموعة مرتبة / Remove member from sorted set */
  static removeFromSortedSet(key: string, member: string): void {
    const set = this.sortedSets.get(key);
    if (!set) return;
    const index = set.findIndex((m) => m.member === member);
    if (index >= 0) {
      set.splice(index, 1);
    }
  }

  /** عدد أعضاء مجموعة مرتبة / Count members in a sorted set */
  static sortedSetSize(key: string): number {
    return this.sortedSets.get(key)?.length ?? 0;
  }

  // ===========================
  // عمليات الحظر / Batch operations
  // ===========================

  /** استرجاع قيم متعددة / Get multiple values */
  static getMany<T>(keys: string[]): (T | null)[] {
    return keys.map((key) => this.get<T>(key));
  }

  /** تخزين قيم متعددة / Store multiple values */
  static setMany(entries: { key: string; value: unknown; ttlMs: number }[]): void {
    entries.forEach(({ key, value, ttlMs }) => this.set(key, value, ttlMs));
  }

  // ===========================
  // الصيانة والإحصائيات / Maintenance and statistics
  // ===========================

  /** إزالة الإدخالات المنتهية الصلاحية / Remove expired entries */
  static cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    this.stats.evictions += removed;
    return removed;
  }

  /** بدء التنظيف التلقائي كل ٥ دقائق / Start auto cleanup every 5 minutes */
  static startAutoCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        // تنظيف صامت — لا نحتاج للتسجيل في الإنتاج
        // Silent cleanup — no logging needed in production
      }
    }, 5 * 60 * 1000); // ٥ دقائق / 5 minutes
  }

  /** إيقاف التنظيف التلقائي / Stop auto cleanup */
  static stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** إحصائيات الكاش / Cache statistics */
  static getStats(): {
    size: number;
    sortedSetCount: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.store.size,
      sortedSetCount: this.sortedSets.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
    };
  }
}

// بدء التنظيف التلقائي عند تحميل الوحدة
// Start auto cleanup when module loads
MemoryCache.startAutoCleanup();

export default MemoryCache;
