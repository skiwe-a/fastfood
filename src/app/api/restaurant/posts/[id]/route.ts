import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db, primaryDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const { id } = await params;
    const postId = parseInt(id);

    const existingPost = await db.offerPost.findUnique({ where: { id: postId } });
    if (!existingPost || existingPost.restaurantId !== profile.id) {
      return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });
    }

    const body = await request.json();

    // [Phase 1] Atomic update with media replacement — all on Primary
    const finalPost = await primaryDb.$transaction(async (tx) => {
      await tx.offerPost.update({
        where: { id: postId },
        data: {
          content: body.content !== undefined ? body.content : existingPost.content,
          type: body.type !== undefined ? body.type : existingPost.type,
          discountPercentage: body.discountPercentage !== undefined
            ? (body.discountPercentage ? parseInt(body.discountPercentage) : null)
            : existingPost.discountPercentage,
          startDate: body.startDate !== undefined
            ? (body.startDate ? new Date(body.startDate) : null)
            : existingPost.startDate,
          endDate: body.endDate !== undefined
            ? (body.endDate ? new Date(body.endDate) : null)
            : existingPost.endDate,
        },
      });

      if (body.media !== undefined) {
        await tx.postMedia.deleteMany({ where: { postId } });
        if (Array.isArray(body.media) && body.media.length > 0) {
          await tx.postMedia.createMany({
            data: body.media.map((item: { url: string; type: string }, index: number) => ({
              postId,
              mediaUrl: item.url,
              mediaType: item.type,
              sortOrder: index,
            })),
          });
        }
      }

      // Re-fetch from same transaction (Primary)
      return tx.offerPost.findUnique({
        where: { id: postId },
        include: { media: true },
      });
    });

    return NextResponse.json({ message: 'تم تحديث المنشور', post: finalPost });
  } catch (error: any) {
    console.error('Post PUT error:', error);
    return sanitizeError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'RESTAURANT') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const profile = await db.restaurantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: 'صفحة المطعم غير موجودة' }, { status: 404 });

    const { id } = await params;
    const postId = parseInt(id);

    const existingPost = await db.offerPost.findUnique({ where: { id: postId } });
    if (!existingPost || existingPost.restaurantId !== profile.id) {
      return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });
    }

    await primaryDb.offerPost.delete({ where: { id: postId } });

    return NextResponse.json({ message: 'تم حذف المنشور' });
  } catch (error: any) {
    console.error('Post DELETE error:', error);
    return sanitizeError(error);
  }
}
