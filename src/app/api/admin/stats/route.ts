import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/error-handler';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

export async function GET() {
  try {
    await requireAdmin();

    const [
      users,
      restaurants,
      activeRestaurants,
      menuItems,
      reviews,
      posts,
      likes,
      follows,
    ] = await Promise.all([
      db.user.count(),
      db.restaurantProfile.count(),
      db.restaurantProfile.count({ where: { isActive: true } }),
      db.menuItem.count(),
      db.review.count(),
      db.offerPost.count(),
      db.like.count(),
      db.follow.count(),
    ]);

    // Recent activity
    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        restaurantProfile: {
          select: { restaurantName: true, isActive: true },
        },
      },
    });

    const recentReviews = await db.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true } },
        restaurant: { select: { restaurantName: true } },
      },
    });

    return NextResponse.json({
      totalUsers: users,
      totalRestaurants: restaurants,
      activeRestaurants,
      totalMenuItems: menuItems,
      totalReviews: reviews,
      totalPosts: posts,
      totalLikes: likes,
      totalFollows: follows,
      recentUsers,
      recentReviews,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return sanitizeError(error);
  }
}
