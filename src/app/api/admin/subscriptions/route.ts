import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

// GET /api/admin/subscriptions - List all subscriptions
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = parseInt(userId);
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { plan: { name: { contains: search } } },
        { paymentRef: { contains: search } },
      ];
    }

    const subscriptions = await db.userSubscription.findMany({
      where,
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
        plan: {
          select: {
            id: true, name: true, nameEn: true, price: true, currency: true,
            duration: true, durationUnit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Stats
    const [totalSubs, activeSubs, pendingSubs] = await Promise.all([
      db.userSubscription.count(),
      db.userSubscription.count({ where: { status: 'ACTIVE' } }),
      db.userSubscription.count({ where: { status: 'PENDING' } }),
    ]);

    // Calculate actual revenue from active subscriptions
    const activeSubsWithPlans = await db.userSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: { select: { price: true } } },
    });
    const revenue = activeSubsWithPlans.reduce((sum, s) => sum + (s.plan?.price || 0), 0);

    return NextResponse.json({
      subscriptions,
      stats: {
        total: totalSubs,
        active: activeSubs,
        pending: pendingSubs,
        revenue,
      },
    });
  } catch (error: any) {
    console.error('Admin subscriptions fetch error:', error);
    return sanitizeError(error);
  }
}

// POST /api/admin/subscriptions - Create subscription manually
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { userId, planId, status, startDate, endDate, paymentRef, paymentMethod, notes } = body;

    if (!userId || !planId || !startDate) {
      return NextResponse.json({ error: 'يرجى ملء جميع الحقول المطلوبة' }, { status: 400 });
    }

    // Check user exists
    const user = await db.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Check plan exists
    const plan = await db.subscriptionPlan.findUnique({ where: { id: parseInt(planId) } });
    if (!plan) {
      return NextResponse.json({ error: 'الخطة غير موجودة' }, { status: 404 });
    }

    // Calculate end date if not provided
    let finalEndDate = endDate ? new Date(endDate) : new Date(startDate);
    if (!endDate) {
      finalEndDate.setDate(finalEndDate.getDate() + plan.duration);
    }

    const subscription = await db.userSubscription.create({
      data: {
        userId: parseInt(userId),
        planId: parseInt(planId),
        status: status || 'PENDING',
        startDate: new Date(startDate),
        endDate: finalEndDate,
        paymentRef: paymentRef || null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true, role: true,
            restaurantProfile: {
              select: { id: true, restaurantName: true, isActive: true, isVerified: true },
            },
          },
        },
        plan: { select: { id: true, name: true, nameEn: true, price: true, currency: true, duration: true, durationUnit: true } },
      },
    });

    // If activating immediately, mark user as active
    if (status === 'ACTIVE') {
      await db.user.update({
        where: { id: parseInt(userId) },
        data: { isActive: true, isFrozen: false },
      });
    }

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error: any) {
    console.error('Admin subscription create error:', error);
    return sanitizeError(error);
  }
}
