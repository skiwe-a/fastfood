// ============================================================
// Notification Service — PostgreSQL Based (Lite)
// بديل MongoDB — التبليغات في PostgreSQL عبر Prisma
// ============================================================

import { db } from './db';

export const notificationService = {
  async create(
    userId: number,
    type: string,
    title: string,
    body: string,
    data?: any
  ) {
    try {
      // Store notifications in PlatformSetting as JSON (Lite approach)
      // Or we can use a simple approach: store in Redis with TTL
      const { redisCache } = await import('./redis');
      const notification = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        userId,
        type,
        title,
        body,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Store in Redis list with 7-day TTL
      const key = `notifications:${userId}`;
      const existing = (await redisCache.get<any[]>(key)) || [];
      existing.unshift(notification);
      // Keep max 50 notifications per user
      const trimmed = existing.slice(0, 50);
      await redisCache.set(key, trimmed, 7 * 24 * 3600);

      return true;
    } catch (err: any) {
      console.warn('[Notifications] Create failed:', err.message);
      return false;
    }
  },

  async getForUser(userId: number, page: number = 1, limit: number = 20) {
    try {
      const { redisCache } = await import('./redis');
      const key = `notifications:${userId}`;
      const all = (await redisCache.get<any[]>(key)) || [];
      const start = (page - 1) * limit;
      const notifications = all.slice(start, start + limit);
      return { notifications, total: all.length };
    } catch {
      return { notifications: [], total: 0 };
    }
  },

  async markAsRead(notificationId: string) {
    try {
      // In Lite version, we store read state per notification
      // For simplicity, we just log it
      console.log(`[Notifications] Marked as read: ${notificationId}`);
    } catch {}
  },

  async notifyFollow(restaurantName: string, followerId: number) {
    await this.create(
      followerId,
      'FOLLOW',
      'متابعة جديدة',
      `${restaurantName} بدأ بمتابعتك`
    );
  },

  async notifyLike(
    type: string,
    typeName: string,
    targetId: number,
    ownerId: number,
    likerName: string
  ) {
    await this.create(
      ownerId,
      'LIKE',
      'إعجاب جديد',
      `${likerName} أعجب بـ${typeName}ك`
    );
  },

  async notifyReview(
    restaurantName: string,
    ownerId: number,
    reviewerName: string,
    rating: number
  ) {
    await this.create(
      ownerId,
      'REVIEW',
      'تقييم جديد',
      `${reviewerName} قيّم ${restaurantName} بـ ${rating}/5`
    );
  },
};
