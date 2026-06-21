import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const reels = await db.reel.findMany({
      where: { restaurantId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(reels);
  } catch (error: any) {
    console.error('Reels GET error:', error);
    return sanitizeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const body = await request.json();

    if (!body.videoUrl) {
      return NextResponse.json({ error: 'رابط الفيديو مطلوب' }, { status: 400 });
    }

    const reel = await db.reel.create({
      data: {
        restaurantId: profile.id,
        videoUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl || null,
        caption: body.caption || null,
      },
    });

    return NextResponse.json({ message: 'تم إنشاء الريل', reel });
  } catch (error: any) {
    console.error('Reels POST error:', error);
    return sanitizeError(error);
  }
}
