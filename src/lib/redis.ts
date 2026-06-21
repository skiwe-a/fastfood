// ============================================================
// Upstash Redis Adapter — Serverless Compatible for Vercel
// بديل ioredis بـ @upstash/redis (يعمل في serverless/edge)
// ============================================================

import { Redis } from '@upstash/redis';

// LRU Cache for L1 (in-memory)
class LRUCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  constructor(private maxSize: number = 500) {}
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expires) { this.cache.delete(key); return undefined; }
    this.cache.delete(key); this.cache.set(key, item);
    return item.value;
  }
  set(key: string, value: T, ttlMs: number = 60000): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }
  del(key: string): void { this.cache.delete(key); }
  clear(): void { this.cache.clear(); }
  get size(): number { return this.cache.size; }
}

let redisClient: Redis | null = null;
const l1Cache = new LRUCache<any>(500);

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  const token = process.env.REDIS_TOKEN;

  if (!url || !token) {
    console.warn('[Redis/Upstash] REDIS_URL or REDIS_TOKEN not set, using L1 cache only');
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
      automaticDeserialization: true,
    });
    console.log('[Redis/Upstash] Connected');
    return redisClient;
  } catch (err: any) {
    console.warn('[Redis/Upstash] Init failed:', err.message);
    return null;
  }
}

export const redisCache = {
  async get<T = any>(key: string): Promise<T | null> {
    // L1 check first
    const l1 = l1Cache.get(key);
    if (l1 !== undefined) return l1;

    const client = getRedisClient();
    if (!client) return null;
    try {
      return await client.get<T>(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const ttlMs = ttlSeconds * 1000;
    l1Cache.set(key, value, ttlMs);

    const client = getRedisClient();
    if (!client) return;
    try {
      await client.set(key, value, { ex: ttlSeconds });
    } catch {
      // silent fail — L1 cache still works
    }
  },

  async del(key: string): Promise<void> {
    l1Cache.del(key);
    const client = getRedisClient();
    if (client) {
      try { await client.del(key); } catch {}
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    l1Cache.clear();
    const client = getRedisClient();
    if (client) {
      try {
        // Upstash doesn't support KEYS — scan with cursor
        let cursor = 0;
        do {
          const result = await client.scan(cursor, { match: pattern, count: 100 });
          cursor = result[0];
          const keys = result[1];
          if (keys.length > 0) {
            await client.del(...keys);
          }
        } while (cursor !== 0);
      } catch {
        // silent fail
      }
    }
  },

  async exists(key: string): Promise<boolean> {
    const l1 = l1Cache.get(key);
    if (l1 !== undefined) return true;

    const client = getRedisClient();
    if (!client) return false;
    try {
      return (await client.exists(key)) === 1;
    } catch {
      return false;
    }
  },

  async cacheResult<T>(key: string, fetcher: () => Promise<T>, ttl: number = 3600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const result = await fetcher();
    await this.set(key, result, ttl);
    return result;
  },

  async ping(): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },

  getClient: () => redisClient,
};

export const sessionManager = {
  async create(sessionId: string, data: any, ttl: number = 86400): Promise<void> {
    await redisCache.set(`session:${sessionId}`, data, ttl);
  },
  async get(sessionId: string): Promise<any | null> {
    return redisCache.get(`session:${sessionId}`);
  },
  async destroy(sessionId: string): Promise<void> {
    await redisCache.del(`session:${sessionId}`);
  },
  async refresh(sessionId: string, ttl: number = 86400): Promise<void> {
    const data = await this.get(sessionId);
    if (data) await this.create(sessionId, data, ttl);
  },
};

export const rateLimiter = {
  async checkLimit(key: string, maxRequests: number = 100, windowSeconds: number = 60): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const client = getRedisClient();
    if (!client) return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
    try {
      const redisKey = `rate:${key}`;
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      // Use sorted set for sliding window (Upstash compatible)
      await client.zremrangebyscore(redisKey, 0, windowStart);
      const count = await client.zcard(redisKey);
      const countNum = typeof count === 'number' ? count : 0;

      if (countNum >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: now + windowSeconds * 1000 };
      }

      await client.zadd(redisKey, { score: now, member: `${now}:${Math.random()}` });
      await client.expire(redisKey, windowSeconds);

      return { allowed: true, remaining: maxRequests - countNum - 1, resetAt: now + windowSeconds * 1000 };
    } catch {
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
    }
  },
};

export { getRedisClient };
