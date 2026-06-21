import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db, primaryDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const posts = await db.offerPost.findMany({
      where: { restaurantId: profile.id },
      include: {
        media: true,
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Posts GET error:', error);
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

    // [Phase 1] Use $transaction to create post + media atomically, read from Primary
    const postWithMedia = await primaryDb.$transaction(async (tx) => {
      const post = await tx.offerPost.create({
        data: {
          restaurantId: profile.id,
          content: body.content,
          type: body.type || 'NEWS',
          discountPercentage: body.discountPercentage ? parseInt(body.discountPercentage) : null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
        },
        include: { media: true },
      });

      if (body.media && Array.isArray(body.media) && body.media.length > 0) {
        await tx.postMedia.createMany({
          data: body.media.map((item: { url: string; type: string }, index: number) => ({
            postId: post.id,
            mediaUrl: item.url,
            mediaType: item.type,
            sortOrder: index,
          })),
        });
      }

      // Re-fetch from same transaction (Primary) to get consistent data with media
      return tx.offerPost.findUnique({
        where: { id: post.id },
        include: { media: true },
      });
    });

    return NextResponse.json({ message: 'تم إنشاء المنشور', post: postWithMedia });
  } catch (error: any) {
    console.error('Posts POST error:', error);
    return sanitizeError(error);
  }
}
