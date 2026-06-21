import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const { id } = await params;
    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const body = await request.json();
    const item = await db.menuItem.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        category: body.category,
        isAvailable: body.isAvailable,
        isPopular: body.isPopular,
        isSpicy: body.isSpicy,
        preparationTime: body.preparationTime ? parseInt(body.preparationTime) : null,
      },
    });

    return NextResponse.json({ message: 'تم تحديث الطبق', item });
  } catch (error: any) {
    console.error('Menu item PUT error:', error);
    return sanitizeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const { id } = await params;
    await db.menuItem.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'تم حذف الطبق' });
  } catch (error: any) {
    console.error('Menu item DELETE error:', error);
    return sanitizeError(error);
  }
}
