import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const followedIds = searchParams.get('followedIds');
    const type = searchParams.get('type');

    const where: any = {};
    if (restaurantId) where.restaurantId = parseInt(restaurantId);
    if (type) where.type = type;
    if (followedIds) {
      const ids = followedIds.split(',').map(Number).filter(Boolean);
      where.restaurantId = { in: ids };
    }

    const posts = await db.offerPost.findMany({
      where,
      include: {
        restaurant: {
          select: { restaurantName: true, slug: true, logo: true, city: true, category: true },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        comments: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
