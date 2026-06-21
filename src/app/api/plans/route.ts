import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    const where: any = {};
    if (all !== 'true') {
      where.isActive = true;
    }

    const plans = await db.subscriptionPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ plans: [] }, { status: 500 });
  }
}
