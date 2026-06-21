import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { restaurantName: { contains: search } },
        { description: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [restaurants, total] = await Promise.all([
      db.restaurantProfile.findMany({
        where,
        include: {
          user: { select: { name: true, image: true } },
          _count: { select: { follows: true, reviews: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { avgRating: 'desc' },
      }),
      db.restaurantProfile.count({ where }),
    ]);

    return NextResponse.json({
      restaurants,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
