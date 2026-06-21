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

    const now = new Date();
    const stories = await db.story.findMany({
      where: {
        restaurantId: profile.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(stories);
  } catch (error: any) {
    console.error('Stories GET error:', error);
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

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await db.story.create({
      data: {
        restaurantId: profile.id,
        mediaUrl: body.mediaUrl || null,
        content: body.content || null,
        storyType: body.storyType || 'IMAGE',
        bgColor: body.bgColor || null,
        expiresAt,
      },
    });

    return NextResponse.json({ message: 'تم إنشاء القصة', story });
  } catch (error: any) {
    console.error('Stories POST error:', error);
    return sanitizeError(error);
  }
}
