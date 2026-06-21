import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const category = searchParams.get('category');

    const where: any = { isAvailable: true };
    if (restaurantId) where.restaurantId = parseInt(restaurantId);
    if (category) where.category = category;

    const services = await db.service.findMany({
      where,
      include: { restaurant: { select: { restaurantName: true, slug: true } } },
    });

    return NextResponse.json(services);
  } catch (error: any) {
    return sanitizeError(error);
  }
}
