// ============================================================
// Admin: List all restaurants (with filters + pagination)
// محمي بـ requireAdmin
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { sanitizeError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const verified = searchParams.get('verified'); // 'true' | 'false' | undefined
    const search = searchParams.get('search');

    const where: any = {};
    if (verified === 'true') where.isVerified = true;
    if (verified === 'false') where.isVerified = false;
    if (search) {
      where.OR = [
        { restaurantName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [restaurants, total] = await Promise.all([
      db.restaurantProfile.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { followers: true, reviews: true, menuItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.restaurantProfile.count({ where }),
    ]);

    return NextResponse.json({
      items: restaurants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return sanitizeError(error);
  }
}
