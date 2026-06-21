import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    const updated = await db.subscriptionPlan.update({
      where: { id: parseInt(id) },
      data: body,
    });

    return NextResponse.json({ plan: updated });
  } catch (error: any) {
    console.error('Admin plan update error:', error);
    return sanitizeError(error);
  }
}
