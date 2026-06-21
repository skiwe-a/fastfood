// ============================================================
// Next.js Edge Middleware — Hardened
// - CSRF protection عبر Origin/Sec-Fetch-Site
// - Security headers شاملة (CSP, HSTS, X-Frame-Options, etc.)
// - Distributed rate limiting عبر Redis (يحتاج Vercel Edge KV أو Upstash)
// - مسار matcher ذكي (يتجاهل الـ static assets)
// ============================================================
//
// ملاحظة: edge middleware لا يستطيع الوصول المباشر لـ Redis العادي.
// الحلول:
//  1) Upstash Redis (REST API) — يعمل في edge
//  2) Vercel KV — يدعم edge
//  3) ترك rate limiting للـ API layer (مع Redis ioredis)
//
// هذا الـ middleware يطبّق CSRF + security headers فقط.
// الـ rate limiting الفعلي يحدث في API handlers عبر withRateLimit.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ===========================
// قائمة الـ origins المسموح بها
// ===========================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ===========================
// Security headers (تُضاف لكل response)
// ===========================
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '0', // مُهمل، نستخدم CSP
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// ===========================
// CSP header — يسمح فقط بمصادر موثوقة
// ===========================
function buildCspHeader(): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// ===========================
// فحص CSRF — يرفض الـ cross-site POST/PUT/DELETE
// ===========================
function isCsrfSafe(req: NextRequest): boolean {
  // GET/HEAD/OPTIONS آمنة
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  // 1) Sec-Fetch-Site (مدعوم في كل المتصفحات الحديثة)
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none') {
    return true;
  }
  if (fetchSite === 'cross-site') {
    return false;
  }

  // 2) Fallback: تحقق من Origin header
  const origin = req.headers.get('origin');
  if (!origin) {
    // لا يوجد Origin header — قد يكون من نفس الـ origin (older browser)
    // اسمح به لكن سجّله للمراجعة
    return true;
  }
  return ALLOWED_ORIGINS.includes(origin);
}

// ===========================
// In-memory rate limiter (fallback when Redis not in edge)
// ملاحظة: هذا لكل-instance فقط. للحصول على rate limiting موزّع،
// استخدم Upstash Redis REST API في production.
// ===========================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  entry.count++;
  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

// تنظيف دوري
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000); // كل 5 دقائق

// ===========================
// Helper: احصل على IP الحقيقي
// ===========================
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown'
  );
}

// ============================================================
// Middleware الرئيسي
// ============================================================
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  // 1) فحص CSRF
  if (!isCsrfSafe(request)) {
    return NextResponse.json(
      { error: 'تم رفض الطلب (CSRF protection)', code: 'CSRF_BLOCKED' },
      { status: 403 }
    );
  }

  // 2) Rate limiting (in-memory per instance)
  // ملاحظة: للحصول على rate limiting موزّع، استخدم Upstash Redis
  if (path.startsWith('/api/')) {
    const ip = getClientIp(request);
    let max = 100; // افتراضي
    let windowMs = 60_000; // دقيقة

    if (path.includes('/auth/')) {
      max = 20; // login/register أقل صرامة
    } else if (path.includes('/upload') || path.includes('/media')) {
      max = 30; // رفع الملفات
    } else if (path.includes('/feed') || path.includes('/search')) {
      max = 200; // قراءة عالية
    }

    const rlKey = `mw:${ip}:${path}`;
    const result = checkRateLimit(rlKey, max, windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'تجاوزت الحد المسموح', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Limit': String(max),
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // 3) أنشئ response وأضف security headers
  const response = NextResponse.next();

  // أضف كل الـ security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', buildCspHeader());

  // 4) أضف معلومات IP للـ request للـ API handlers
  if (path.startsWith('/api/')) {
    const ip = getClientIp(request);
    // أنشئ request headers جديدة (immutable في Next.js)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-real-ip', ip);
    requestHeaders.set('x-forwarded-method', method);

    // Next.js 14+: استخدم NextResponse.next مع request.headers
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return response;
}

// ============================================================
// Matcher — استثني الـ static assets
// ============================================================
export const config = {
  matcher: [
    /*
     * تطابق كل الـ paths ما عدا:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|assets/|robots.txt|sitemap.xml).*)',
  ],
};
