// POST /api/interactions — تسجيل تفاعل المستخدم مع المحتوى
// Record user interaction with content (view, like, share, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { getCurrentUser } from '@/lib/auth-helper';
import { recordInteraction } from '@/lib/algorithm/efs-engine';
import { type ContentType, type InteractionType } from '@/lib/algorithm/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const body = await request.json();
    const { contentId, contentType, interactionType, watchDuration, totalDuration, scrollVelocity, sessionDuration } = body;

    if (!contentId || !contentType || !interactionType) {
      return NextResponse.json({ error: 'بيانات غير مكتملة: contentId, contentType, interactionType مطلوبة' }, { status: 400 });
    }

    const validContentTypes: ContentType[] = ['REEL', 'POST', 'STORY'];
    const validInteractionTypes: InteractionType[] = ['VIEW', 'LIKE', 'COMMENT', 'SHARE', 'SAVE', 'SCROLL_PAST', 'REWATCH', 'COMPLETE_WATCH'];

    if (!validContentTypes.includes(contentType.toUpperCase())) {
      return NextResponse.json({ error: 'نوع محتوى غير صالح. الأنواع: REEL, POST, STORY' }, { status: 400 });
    }
    if (!validInteractionTypes.includes(interactionType.toUpperCase())) {
      return NextResponse.json({ error: 'نوع تفاعل غير صالح. الأنواع: VIEW, LIKE, COMMENT, SHARE, SAVE, SCROLL_PAST, REWATCH, COMPLETE_WATCH' }, { status: 400 });
    }

    const result = await recordInteraction({
      userId: user.id,
      contentId: parseInt(contentId),
      contentType: contentType.toUpperCase() as ContentType,
      interactionType: interactionType.toUpperCase() as InteractionType,
      watchDuration: watchDuration ? parseFloat(watchDuration) : undefined,
      totalDuration: totalDuration ? parseFloat(totalDuration) : undefined,
      scrollVelocity: scrollVelocity ? parseFloat(scrollVelocity) : undefined,
      sessionDuration: sessionDuration ? parseFloat(sessionDuration) : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Interaction API error:', error);
    return sanitizeError(error);
  }
}
