// ============================================================
// API Middleware — Lite (no InfluxDB analytics)
// - Redis-based distributed rate limiting (Upstash)
// - Request timeouts
// - Caching with Upstash
// - No InfluxDB metrics (removed)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { redisCache, rateLimiter } from './redis';
import { sanitizeError } from './error-handler';

type HandlerFunction = (req: NextRequest, ctx?: any) => Promise<NextResponse>;

const DEFAULT_TIMEOUT_MS = 30_000;

// ===========================
// withCache — Redis caching for GET endpoints
// ===========================
export function withCache(ttlSeconds: number = 300, options?: { varyByUser?: boolean }) {
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      if (req.method !== 'GET') return handler(req, ctx);

      const userSuffix = options?.varyByUser
        ? `:${req.headers.get('x-user-id') || 'anon'}`
        : '';
      const cacheKey = `api:${req.nextUrl.pathname}${userSuffix}:${req.nextUrl.search}`;

      try {
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          const res = NextResponse.json(cached);
          res.headers.set('X-Cache', 'HIT');
          res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
          return res;
        }
      } catch (err) {
        console.warn('[withCache] Redis get failed:', err);
      }

      const response = await handler(req, ctx);
      if (response.ok) {
        try {
          const data = await response.clone().json();
          await redisCache.set(cacheKey, data, ttlSeconds);
        } catch (err) {
          console.warn('[withCache] Redis set failed:', err);
        }
        const newRes = NextResponse.json(data || await response.clone().json());
        newRes.headers.set('X-Cache', 'MISS');
        newRes.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
        return newRes;
      }
      return response;
    };
  };
}

// ===========================
// withRateLimit — Redis-based rate limiting (Upstash)
// ===========================
export function withRateLimit(
  maxRequests: number = 100,
  windowSeconds: number = 60,
  options?: { scope?: 'ip' | 'user' | 'both' }
) {
  const scope = options?.scope || 'both';
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
      const userId = req.headers.get('x-user-id');

      const keys: string[] = [];
      if (scope === 'ip' || scope === 'both') {
        keys.push(`ip:${ip}:${req.nextUrl.pathname}`);
      }
      if ((scope === 'user' || scope === 'both') && userId) {
        keys.push(`user:${userId}:${req.nextUrl.pathname}`);
      }
      if (keys.length === 0) {
        keys.push(`ip:${ip}:${req.nextUrl.pathname}`);
      }

      try {
        for (const key of keys) {
          const result = await rateLimiter.checkLimit(key, maxRequests, windowSeconds);
          if (!result.allowed) {
            return NextResponse.json(
              {
                error: 'تجاوزت الحد المسموح من الطلبات',
                code: 'RATE_LIMITED',
                remaining: result.remaining,
                resetAt: result.resetAt,
              },
              {
                status: 429,
                headers: {
                  'X-RateLimit-Remaining': String(result.remaining),
                  'X-RateLimit-Limit': String(maxRequests),
                  'Retry-After': String(
                    Math.ceil((result.resetAt - Date.now()) / 1000)
                  ),
                },
              }
            );
          }
        }
      } catch (err) {
        console.warn('[withRateLimit] Redis unavailable, allowing request:', err);
      }

      req.headers.set('x-real-ip', ip);
      const response = await handler(req, ctx);
      return response;
    };
  };
}

// ===========================
// withTimeout
// ===========================
export function withTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      try {
        const response = await Promise.race([
          handler(req, ctx),
          new Promise<NextResponse>((_, reject) =>
            setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
          ),
        ]);
        return response;
      } catch (err: any) {
        if (err.message === 'REQUEST_TIMEOUT') {
          return NextResponse.json(
            { error: 'انتهت مهلة الطلب', code: 'TIMEOUT' },
            { status: 504 }
          );
        }
        return sanitizeError(err);
      }
    };
  };
}

// ===========================
// withIdempotency
// ===========================
export function withIdempotency(ttlSeconds: number = 300) {
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      if (req.method !== 'POST' && req.method !== 'PUT') {
        return handler(req, ctx);
      }

      const idempotencyKey = req.headers.get('idempotency-key');
      if (!idempotencyKey) {
        return handler(req, ctx);
      }

      const cacheKey = `idem:${idempotencyKey}`;
      try {
        const cached = await redisCache.get<{ status: number; body: any }>(cacheKey);
        if (cached) {
          const res = NextResponse.json(cached.body, { status: cached.status });
          res.headers.set('X-Idempotent', 'REPLAY');
          return res;
        }
      } catch (err) {
        console.warn('[withIdempotency] Redis get failed:', err);
      }

      const response = await handler(req, ctx);

      if (response.status < 500) {
        try {
          const data = await response.clone().json();
          await redisCache.set(cacheKey, {
            status: response.status,
            body: data,
          }, ttlSeconds);
        } catch (err) {
          console.warn('[withIdempotency] Redis set failed:', err);
        }
      }

      response.headers.set('X-Idempotent', 'FIRST');
      return response;
    };
  };
}

// ===========================
// withMetrics — No-op in Lite (InfluxDB removed)
// Analytics removed for Lite version
// ===========================
export function withMetrics(_event: string) {
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      return handler(req, ctx);
    };
  };
}

// ===========================
// withAuth — JWT validation
// ===========================
export function withAuth(requiredRole?: string) {
  return (handler: HandlerFunction) => {
    return async (req: NextRequest, ctx?: any) => {
      try {
        const token = req.headers
          .get('authorization')
          ?.replace('Bearer ', '');
        if (!token)
          return NextResponse.json(
            { error: 'يجب تسجيل الدخول', code: 'UNAUTHORIZED' },
            { status: 401 }
          );

        const parts = token.split('.');
        if (parts.length !== 3)
          return NextResponse.json(
            { error: 'رمز غير صالح', code: 'INVALID_TOKEN' },
            { status: 401 }
          );

        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString()
        );

        if (payload.exp && Date.now() / 1000 > payload.exp) {
          return NextResponse.json(
            { error: 'انتهت الجلسة', code: 'TOKEN_EXPIRED' },
            { status: 401 }
          );
        }

        if (
          requiredRole &&
          payload.role !== requiredRole &&
          payload.role !== 'ADMIN'
        ) {
          return NextResponse.json(
            { error: 'غير مصرح', code: 'FORBIDDEN' },
            { status: 403 }
          );
        }

        req.headers.set('x-user-id', String(payload.id));
        req.headers.set('x-user-role', String(payload.role));

        return handler(req, ctx);
      } catch {
        return NextResponse.json(
          { error: 'فشل المصادقة', code: 'AUTH_FAILED' },
          { status: 401 }
        );
      }
    };
  };
}

// ===========================
// compose — combine middlewares
// ===========================
export function compose(...middlewares: Array<ReturnType<typeof withCache>>) {
  return (handler: HandlerFunction) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
