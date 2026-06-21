import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const stories = await db.story.findMany({
      where: {
        expiresAt: { gt: now },
      },
      include: {
        restaurant: {
          select: {
            id: true,
            restaurantName: true,
            slug: true,
            logo: true,
            city: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped: Record<number, typeof stories> = {};
    for (const story of stories) {
      if (!grouped[story.restaurantId]) {
        grouped[story.restaurantId] = [];
      }
      grouped[story.restaurantId].push(story);
    }

    const result = Object.values(grouped).map((group) => ({
      restaurant: group[0].restaurant,
      stories: group,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
