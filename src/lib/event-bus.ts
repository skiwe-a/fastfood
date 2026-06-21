// ============================================================
// Event Bus — Simplified (Lite)
// بديل Kafka + Elasticsearch — أحداث محلية فقط مع Redis cache invalidation
// ============================================================

import { redisCache } from './redis';

interface PlatformEvent {
  type: string;
  payload: any;
  timestamp: string;
  userId?: number;
  traceId: string;
}

const localQueue: PlatformEvent[] = [];
let isProcessing = false;

async function processEvent(event: PlatformEvent) {
  // Invalidate relevant cache
  const cachePatterns: Record<string, string> = {
    'post.published': 'api:/api/feed*',
    'post.liked': `api:/api/posts/${event.payload.postId}*`,
    'follow.created': 'api:/api/feed*',
    'review.posted': `api:/api/restaurants/${event.payload.restaurantSlug}*`,
  };
  const pattern = cachePatterns[event.type];
  if (pattern) {
    try {
      await redisCache.invalidatePattern(pattern);
    } catch {}
  }

  // In Lite mode, we don't have Kafka or ES to sync to
  // Events are processed locally (cache invalidation only)
}

async function flushQueue() {
  if (isProcessing || localQueue.length === 0) return;
  isProcessing = true;
  while (localQueue.length > 0) {
    const event = localQueue.shift()!;
    try {
      await processEvent(event);
    } catch (err: any) {
      console.warn('[EventBus] Failed to process:', err.message);
    }
  }
  isProcessing = false;
}

// Process queue every 2 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(flushQueue, 2000);
}

export const eventBus = {
  async publish(type: string, payload: any, userId?: number) {
    const event: PlatformEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      userId,
      traceId: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
    localQueue.push(event);
    if (localQueue.length >= 10) flushQueue();
  },
  flushQueue,
};

// Events and Topics constants for backward compat
export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',
  POST_PUBLISHED: 'post.published',
  POST_DELETED: 'post.deleted',
  POST_LIKED: 'post.liked',
  COMMENT_ADDED: 'comment.added',
  FOLLOW_CREATED: 'follow.created',
  FOLLOW_REMOVED: 'follow.removed',
  REVIEW_POSTED: 'review.posted',
  RATING_CREATED: 'rating.created',
  MENU_ITEM_UPDATED: 'menu_item.updated',
  INTERACTION_RECORDED: 'interaction.recorded',
} as const;

export const TOPICS = {
  USER_EVENTS: 'user-events',
  CONTENT_EVENTS: 'content-events',
  NOTIFICATION_EVENTS: 'notification-events',
  ANALYTICS_EVENTS: 'analytics-events',
  DEAD_LETTER: 'dead-letter-queue',
} as const;
