// ============================================================
// Register — Hardened with Zod validation + bcrypt 12
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { primaryDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/auth';
import { sanitizeError } from '@/lib/error-handler';
import { registerSchema } from '@/lib/schemas';
import { withRateLimit } from '@/lib/api-middleware';
import { redisCache } from '@/lib/redis';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();

    // 1) التحقق عبر Zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'بيانات غير صالحة',
          details: parsed.error.flatten().fieldErrors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }
    const { name, email, password, role, restaurantName, whatsapp, category, city, phone } = parsed.data;

    const normalizedEmail = email.trim().toLowerCase();

    // 2) Check existing user
    const existingUser = await primaryDb.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مسجل مسبقاً', code: 'CONFLICT' },
        { status: 409 }
      );
    }

    // 3) Hash password with 12 rounds
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 4) Transaction: user + restaurant profile (if RESTAURANT role)
    const user = await primaryDb.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone?.trim() || null,
          role: role || 'CUSTOMER',
        },
      });

      if (role === 'RESTAURANT') {
        // إنشاء slug فريد
        const baseSlug = restaurantName!
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\u0621-\u064A-]/g, '')
          .substring(0, 40);
        const slug = `${baseSlug}-${Date.now().toString(36)}`;

        await tx.restaurantProfile.create({
          data: {
            userId: newUser.id,
            slug,
            restaurantName: restaurantName!.trim(),
            description: '',
            whatsapp: whatsapp!.trim(),
            phone: phone?.trim() || null,
            address: city,
            city,
            category,
            openingHours: '10:00 - 22:00',
          },
        });
      }

      return newUser;
    });

    // 5) Clear any previous lockout attempts for this email
    await redisCache.del(`lockout:${normalizedEmail}`);

    // 6) Don't return password hash
    return NextResponse.json(
      {
        message: 'تم إنشاء الحساب بنجاح',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      { status: 201 }
    );
  } catch (error) {
    return sanitizeError(error);
  }
}

// Rate limit: 5 registrations per hour per IP (anti-abuse)
export const POST = withRateLimit(handler, 5, 3600);
