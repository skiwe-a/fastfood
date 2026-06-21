// GET /api/algorithm/metrics — مقاييس أداء الخوارزمية (للمشرف)
// POST /api/algorithm/metrics — تدريب أوزان المستخدم الحالي
import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { getAlgorithmMetrics, trainUserWeights } from '@/lib/algorithm/efs-engine';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح — يتطلب صلاحية مشرف' }, { status: 403 });
    }
    const metrics = await getAlgorithmMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    return sanitizeError(error);
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    const newWeights = await trainUserWeights(user.id);
    if (newWeights) {
      return NextResponse.json({ success: true, weights: newWeights });
    }
    return NextResponse.json({ success: false, message: 'بيانات غير كافية للتدريب (يحتاج 5 تفاعلات على الأقل)' });
  } catch (error: any) {
    return sanitizeError(error);
  }
}
