import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const restaurant = await db.restaurantProfile.findUnique({ where: { slug } });
    if (!restaurant) return NextResponse.json({ error: 'المطعم غير موجود' }, { status: 404 });

    const reviews = await db.review.findMany({
      where: { restaurantId: restaurant.id },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
