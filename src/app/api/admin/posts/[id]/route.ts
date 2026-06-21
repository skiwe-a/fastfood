import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    await db.offerPost.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true, message: 'تم حذف المنشور' });
  } catch (error: any) {
    console.error('Admin post delete error:', error);
    return sanitizeError(error);
  }
}
