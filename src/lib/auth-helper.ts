// ============================================================
// Auth Helper — Hardened (no fallback secret)
// ============================================================

import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// ✅ احصل على الـ secret بشكل آمن
function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET مطلوب في الإنتاج');
    }
    console.warn('⚠️ [DEV] NEXTAUTH_SECRET غير مضبوط');
    return 'dev-only-secret-change-in-production-min-32-chars-padding!!!';
  }
  return secret;
}

export async function getCurrentUser(request?: NextRequest) {
  try {
    const cookieStore = request ? request.cookies : await cookies();
    const secret = getAuthSecret();
    const token = await getToken({
      req: {
        headers: { cookie: cookieStore.toString() },
      } as any,
      secret,
    });
    if (!token) return null;

    // ✅ تحقق من انتهاء صلاحية الـ token
    if (token.exp && Date.now() / 1000 > token.exp) {
      return null;
    }

    return {
      id: Number(token.id),
      name: String(token.name || ''),
      email: String(token.email || ''),
      role: String(token.role || 'CUSTOMER'),
      image: (token.picture as string) || null,
      isActive: true, // لا يمكن التحقق بدون استعلام DB — افترض true
      isFrozen: false,
    };
  } catch (error) {
    console.error('[getCurrentUser] error:', error);
    return null;
  }
}

export async function requireAuth(request?: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireRole(request: NextRequest, ...roles: string[]) {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
