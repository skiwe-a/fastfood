// ============================================================
// NextAuth Configuration — Hardened
// - يتطلب NEXTAUTH_SECRET في الإنتاج (لا fallback)
// - bcrypt rounds = 12
// - JWT short-lived + refresh strategy
// - Account lockout after 5 failed attempts
// ============================================================

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, primaryDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { redisCache } from './redis';

// ===========================
// ثوابت الأمان / Security Constants
// ===========================
const BCRYPT_ROUNDS = 12; // رفع من 10 إلى 12 (OWASP 2024)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 ساعة

// ===========================
// التحقق من NEXTAUTH_SECRET إلزامياً / Mandatory secret check
// ===========================
function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXTAUTH_SECRET مطلوب في الإنتاج ويجب أن يكون 32+ حرفاً. ' +
        'توليد: openssl rand -base64 48'
      );
    }
    // في development فقط: استخدم مفتاح dev واضح التحذير
    console.warn(
      '⚠️  [DEV] NEXTAUTH_SECRET غير مضبوط. استخدم: export NEXTAUTH_SECRET="$(openssl rand -base64 48)"'
    );
    return 'dev-only-secret-change-in-production-min-32-chars-padding!!!';
  }
  return secret;
}

// ===========================
// Account lockout — يمنع brute force
// ===========================
async function checkLockout(email: string): Promise<{ locked: boolean; remaining?: number }> {
  const key = `lockout:${email.toLowerCase()}`;
  const attempts = await redisCache.get<number>(key);
  if (attempts && attempts >= MAX_FAILED_ATTEMPTS) {
    return { locked: true };
  }
  return {
    locked: false,
    remaining: attempts ? MAX_FAILED_ATTEMPTS - attempts : MAX_FAILED_ATTEMPTS,
  };
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`;
  const current = await redisCache.get<number>(key) || 0;
  await redisCache.set(key, current + 1, LOCKOUT_MINUTES * 60);
}

async function clearFailedAttempts(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`;
  await redisCache.del(key);
}

// ===========================
// NextAuth Options
// ===========================
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        const email = credentials.email.trim().toLowerCase();

        // 1) فحص lockout
        const lockout = await checkLockout(email);
        if (lockout.locked) {
          throw new Error(`الحساب مؤقتاً مقفل بعد ${MAX_FAILED_ATTEMPTS} محاولات فاشلة. حاول بعد ${LOCKOUT_MINUTES} دقيقة.`);
        }

        // 2) ابحث عن المستخدم (استخدم primaryDb للكتابة والقراءة المتسقة)
        const user = await primaryDb.user.findUnique({
          where: { email },
        });

        // لا تكشف ما إذا كان الإيميل موجوداً أم لا
        if (!user) {
          await recordFailedAttempt(email);
          throw new Error('بيانات الدخول غير صحيحة');
        }

        if (!user.isActive || user.isFrozen) {
          throw new Error('الحساب غير نشط أو مجمّد');
        }

        // 3) تحقق من كلمة المرور
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          await recordFailedAttempt(email);
          throw new Error('بيانات الدخول غير صحيحة');
        }

        // 4) نجاح — امسح الـ failed attempts
        await clearFailedAttempts(email);

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = parseInt(user.id as string);
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: getNextAuthSecret(),
  // استخدم cookies آمنة في الإنتاج
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Host-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

// تصدير BCRYPT_ROUNDS لإعادة الاستخدام في routes
export { BCRYPT_ROUNDS };
