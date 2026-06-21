import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const body = await request.json();
    const item = await db.menuItem.create({
      data: {
        restaurantId: profile.id,
        name: body.name,
        description: body.description || null,
        price: parseFloat(body.price),
        category: body.category,
        isPopular: body.isPopular || false,
        isSpicy: body.isSpicy || false,
        preparationTime: body.preparationTime ? parseInt(body.preparationTime) : null,
        calories: body.calories ? parseInt(body.calories) : null,
      },
    });

    return NextResponse.json({ message: 'تم إضافة الطبق', item });
  } catch (error: any) {
    console.error('Menu items POST error:', error);
    return sanitizeError(error);
  }
}
