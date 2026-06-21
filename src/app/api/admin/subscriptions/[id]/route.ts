import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

// PUT /api/admin/subscriptions/[id] - Update subscription (activate, cancel, extend)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const subId = parseInt(id);
    const body = await request.json();

    const existing = await db.userSubscription.findUnique({
      where: { id: subId },
      include: { user: true, plan: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'الاشتراك غير موجود' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.paymentRef !== undefined) updateData.paymentRef = body.paymentRef;
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // If activating, calculate end date from plan duration if not provided
    if (body.status === 'ACTIVE' && !body.endDate && existing.plan) {
      const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
      updateData.startDate = startDate;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + existing.plan.duration);
      updateData.endDate = endDate;
    }

    const updated = await db.userSubscription.update({
      where: { id: subId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true, role: true,
            isActive: true, isFrozen: true,
            restaurantProfile: {
              select: { id: true, restaurantName: true, isActive: true, isVerified: true },
            },
          },
        },
        plan: { select: { id: true, name: true, nameEn: true, price: true, currency: true, duration: true, durationUnit: true } },
      },
    });

    // Update user status based on subscription
    if (body.status === 'ACTIVE') {
      await db.user.update({
        where: { id: existing.userId },
        data: { isActive: true, isFrozen: false },
      });
    } else if (body.status === 'CANCELLED') {
      await db.user.update({
        where: { id: existing.userId },
        data: { isFrozen: true },
      });
    }

    return NextResponse.json({ subscription: updated });
  } catch (error: any) {
    console.error('Admin subscription update error:', error);
    return sanitizeError(error);
  }
}

// DELETE /api/admin/subscriptions/[id] - Delete subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const subId = parseInt(id);

    const existing = await db.userSubscription.findUnique({ where: { id: subId } });
    if (!existing) {
      return NextResponse.json({ error: 'الاشتراك غير موجود' }, { status: 404 });
    }

    await db.userSubscription.delete({ where: { id: subId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin subscription delete error:', error);
    return sanitizeError(error);
  }
}
