import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    if (!q) return NextResponse.json({ restaurants: [], menuItems: [], services: [] });

    const searchTerm = q.trim();

    const [restaurants, menuItems, services] = await Promise.all([
      db.restaurantProfile.findMany({
        where: {
          isActive: true,
          OR: [
            { restaurantName: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { category: { contains: searchTerm } },
            { city: { contains: searchTerm } },
          ],
        },
        take: 10,
      }),
      db.menuItem.findMany({
        where: {
          isAvailable: true,
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
        include: { restaurant: { select: { restaurantName: true, slug: true } } },
        take: 10,
      }),
      db.service.findMany({
        where: {
          isAvailable: true,
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
        include: { restaurant: { select: { restaurantName: true, slug: true } } },
        take: 10,
      }),
    ]);

    return NextResponse.json({ restaurants, menuItems, services });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
