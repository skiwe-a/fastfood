// ============================================================
// Search Service — PostgreSQL Only (Lite)
// بديل Elasticsearch — البحث عبر Prisma فقط
// ============================================================

import { db } from './db';

export const searchService = {
  INDICES: {
    restaurants: 'platform_restaurants',
    posts: 'platform_posts',
    users: 'platform_users',
    reviews: 'platform_reviews',
    comments: 'platform_comments',
  },
  isAvailable: () => false, // Elasticsearch disabled
};

export const unifiedSearchService = {
  async searchRestaurants(query: string, filters: any = {}) {
    // PostgreSQL search only (no Elasticsearch)
    const restaurants = await db.restaurantProfile.findMany({
      where: {
        isActive: true,
        ...(filters.city && { city: filters.city }),
        ...(filters.category && { category: filters.category }),
        OR: [
          { restaurantName: { contains: query } },
          { description: { contains: query } },
          { cuisineType: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { avgRating: 'desc' },
      select: {
        id: true,
        slug: true,
        restaurantName: true,
        description: true,
        logo: true,
        city: true,
        category: true,
        cuisineType: true,
        avgRating: true,
        followersCount: true,
        isVerified: true,
      },
    });
    return {
      results: restaurants,
      total: restaurants.length,
      source: 'postgresql',
    };
  },

  async searchPosts(query: string) {
    const posts = await db.offerPost.findMany({
      where: { content: { contains: query } },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { restaurantName: true, slug: true, logo: true },
        },
      },
    });
    return {
      results: posts,
      total: posts.length,
      source: 'postgresql',
    };
  },

  async autocomplete(query: string) {
    const restaurants = await db.restaurantProfile.findMany({
      where: { restaurantName: { startsWith: query } },
      take: 10,
      select: {
        id: true,
        restaurantName: true,
        slug: true,
        city: true,
      },
    });
    return restaurants;
  },

  // No-op for ES indexing (Lite)
  async indexRestaurant(_restaurant: any) {
    // No-op — ES disabled
  },

  async reindexAll() {
    console.log('[Search] Reindex skipped — Elasticsearch disabled in Lite mode');
  },
};
