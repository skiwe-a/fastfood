import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const body = await request.json();
    const service = await db.service.create({
      data: {
        restaurantId: profile.id,
        name: body.name,
        description: body.description,
        price: body.price ? parseFloat(body.price) : null,
        category: body.category,
      },
    });

    return NextResponse.json({ message: 'تم إضافة الخدمة', service });
  } catch (error: any) {
    console.error('Services POST error:', error);
    return sanitizeError(error);
  }
}
