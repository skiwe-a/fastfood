import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') {
      console.error('Profile GET auth failed:', user ? `role=${user.role}` : 'no user');
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const profile = await db.restaurantProfile.findUnique({
      where: { userId: user.id },
      include: {
        _count: { select: { menuItems: true, services: true, offerPosts: true, followers: true, reviews: true } },
      },
    });

    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return sanitizeError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') {
      console.error('Profile PUT auth failed:', user ? `role=${user.role}` : 'no user');
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const body = await request.json();
    console.log('Profile PUT body:', JSON.stringify(body).substring(0, 200));

    const updated = await db.restaurantProfile.update({
      where: { id: profile.id },
      data: {
        restaurantName: body.restaurantName,
        description: body.description,
        whatsapp: body.whatsapp,
        phone: body.phone || null,
        address: body.address,
        city: body.city,
        area: body.area || null,
        category: body.category,
        cuisineType: body.cuisineType || null,
        openingHours: body.openingHours,
        deliveryAvailable: Boolean(body.deliveryAvailable),
        logo: body.logo || null,
        coverImage: body.coverImage || null,
        website: body.website || null,
        minOrderAmount: body.minOrderAmount != null ? parseFloat(String(body.minOrderAmount)) : null,
      },
    });

    return NextResponse.json({ message: 'تم تحديث الصفحة', profile: updated });
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return sanitizeError(error);
  }
}
