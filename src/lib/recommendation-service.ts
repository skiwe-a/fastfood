// ============================================================
// Recommendation Service — PostgreSQL Only (Lite)
// بديل Neo4j — التوصيات عبر Prisma فقط (بدون graph database)
// ============================================================

import { db } from './db';

export const recommendationService = {
  async getRecommendations(userId: number, limit: number = 10) {
    try {
      // Get followed restaurants to exclude
      const followed = await db.follow.findMany({
        where: { userId },
        select: { restaurantId: true },
      });
      const followedIds = new Set(followed.map((f) => f.restaurantId));

      // Find restaurants followed by similar users (collaborative filtering via SQL)
      // Users who follow the same restaurants as this user
      const similarUserFollows = await db.follow.findMany({
        where: {
          restaurantId: { in: Array.from(followedIds) },
          userId: { not: userId },
        },
        select: { userId: true, restaurantId: true },
        take: 500,
      });

      // Find restaurants followed by similar users but not by this user
      const similarUserIds = new Set(similarUserFollows.map(f => f.userId));
      if (similarUserIds.size > 0) {
        const recommendations = await db.follow.findMany({
          where: {
            userId: { in: Array.from(similarUserIds).slice(0, 100) },
            restaurantId: { notIn: Array.from(followedIds) },
          },
          select: { restaurantId: true },
          take: limit * 3,
        });

        const recIds = [...new Set(recommendations.map(r => r.restaurantId))].slice(0, limit);

        if (recIds.length > 0) {
          const restaurants = await db.restaurantProfile.findMany({
            where: {
              id: { in: recIds },
              isActive: true,
            },
            select: {
              id: true,
              slug: true,
              restaurantName: true,
              description: true,
              logo: true,
              city: true,
              category: true,
              avgRating: true,
              followersCount: true,
            },
            take: limit,
          });

          if (restaurants.length > 0) return restaurants;
        }
      }

      // Fallback: popular verified restaurants
      const popular = await db.restaurantProfile.findMany({
        where: { isActive: true, isVerified: true },
        orderBy: { followersCount: 'desc' },
        take: limit,
        select: {
          id: true,
          slug: true,
          restaurantName: true,
          description: true,
          logo: true,
          city: true,
          category: true,
          avgRating: true,
          followersCount: true,
        },
      });
      return popular;
    } catch (err: any) {
      console.warn('[Recommendations] Error:', err.message);
      return db.restaurantProfile.findMany({
        where: { isActive: true, isVerified: true },
        orderBy: { avgRating: 'desc' },
        take: limit,
        select: {
          id: true,
          slug: true,
          restaurantName: true,
          description: true,
          logo: true,
          city: true,
          category: true,
          avgRating: true,
          followersCount: true,
        },
      });
    }
  },

  async recordInteraction(
    _userId: number,
    _restaurantId: number,
    _type: string = 'VIEW'
  ) {
    // In Lite mode, interactions are recorded via the EFS engine
    // No Neo4j graph recording needed
  },

  async syncFollowsToGraph() {
    // No-op — Neo4j removed in Lite
    console.log('[Recommendations] Graph sync skipped — Neo4j disabled in Lite mode');
  },
};

// graphService stub for backward compat
export const graphService = {
  isAvailable: () => false,
  runQuery: async () => [],
  followUser: async () => {},
  unfollowUser: async () => {},
  getRecommendations: async () => [],
  getFollowersCount: async () => 0,
};
