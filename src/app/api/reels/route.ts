import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const reels = await db.reel.findMany({
      include: {
        restaurant: {
          select: {
            restaurantName: true,
            slug: true,
            logo: true,
            city: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(reels);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
