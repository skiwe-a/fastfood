import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const restaurant = await db.restaurantProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { name: true, image: true } },
        menuItems: { where: { isAvailable: true }, orderBy: { isPopular: 'desc' } },
        services: { where: { isAvailable: true } },
        offerPosts: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { follows: true, reviews: true, menuItems: true, services: true } },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'المطعم غير موجود' }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
