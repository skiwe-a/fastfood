import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    const comments = await db.comment.findMany({
      where: { postId },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    return sanitizeError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

    const { id } = await params;
    const postId = parseInt(id);

    const post = await db.offerPost.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });

    const body = await request.json();

    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: 'محتوى التعليق مطلوب' }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        content: body.content,
        postId,
        userId: user.id,
      },
      include: { user: { select: { name: true, image: true } } },
    });

    return NextResponse.json({ message: 'تم إضافة التعليق', comment });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
