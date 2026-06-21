import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helper';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ isRestaurant: false });
    return NextResponse.json({ isRestaurant: user.role === 'RESTAURANT', role: user.role });
  } catch {
    return NextResponse.json({ isRestaurant: false });
  }
}
