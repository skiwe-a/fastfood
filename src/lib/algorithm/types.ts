// أنواع خوارزمية Adaptive Engagement Flow (EFS)
// Type Definitions for the EFS Recommendation Algorithm

export type ContentType = 'REEL' | 'POST' | 'STORY';
export type InteractionType =
  | 'VIEW'
  | 'LIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'SAVE'
  | 'SCROLL_PAST'
  | 'REWATCH'
  | 'COMPLETE_WATCH';

// حمولة التفاعل — البيانات المرسلة عند كل تفاعل مستخدم
// Interaction payload — data sent on every user interaction
export interface InteractionPayload {
  userId: number;
  contentId: number;
  contentType: ContentType;
  interactionType: InteractionType;
  watchDuration?: number; // مدة المشاهدة بالثواني / seconds watched
  totalDuration?: number; // المدة الإجمالية للمحتوى بالثواني / total content duration in seconds
  scrollVelocity?: number; // مللي ثانية لكل بكسل (عكسي = سلبية = إشارة إعادة مشاهدة) / ms per pixel
  timestamp?: number; // ملي ثانية منذ الحقبة / epoch ms
}

// نتيجة حساب EFS لكل محتوى
// EFS score result for each content item
export interface EFSScore {
  contentId: number;
  contentType: ContentType;
  efs: number;
  breakdown: {
    R: number; // نقاط التفاعل / Interaction score
    T: number; // نسبة إكمال المشاهدة / Watch completion
    C: number; // تشابه المحتوى / Content similarity
    S: number; // الإشارة الاجتماعية / Social signal
    H: number; // سجل المستخدم / User history
    U: number; // تطابق التوقيت / Timing match
    D: number; // تلاشي الوقت / Time decay
  };
}

// عنصر في الخلاصة المخصصة
// Item in the personalized feed
export interface FeedItem {
  id: number;
  contentType: ContentType;
  restaurantId: number;
  restaurantName: string;
  content: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  efs: number;
  breakdown: EFSScore['breakdown'];
  createdAt: string;
}

// أوزان المستخدم المخصصة لكل عامل
// User's personalized weights for each factor
export interface UserWeights {
  w1: number; // وزن التفاعلات / R weight
  w2: number; // وزن إكمال المشاهدة / T weight
  w3: number; // وزن تشابه المحتوى / C weight
  w4: number; // وزن الإشارات الاجتماعية / S weight
  w5: number; // وزن سجل المستخدم / H weight
  w6: number; // وزن تطابق التوقيت / U weight
}

// مقاييس أداء الخوارزمية
// Algorithm performance metrics
export interface AlgorithmMetrics {
  totalFeedRequests: number;
  avgEFSScore: number;
  avgCompletionRate: number;
  avgInteractionRate: number;
  avgSessionDuration: number;
  explorationRate: number;
  irrScore: number; // معدل الاحتفاظ الفوري / Immediate Retention Rate
  topCategories: { category: string; score: number }[];
}

// الذاكرة قصيرة المدى للمستخدم (آخر ٣٠ دقيقة)
// User's short-term memory (last 30 minutes)
export interface ShortTermMemory {
  recentContentIds: number[];
  recentCategories: string[];
  recentInteractions: {
    contentId: number;
    type: InteractionType;
    timestamp: number;
  }[];
  moodVector: number[]; // متجه عاطفي ١٦ بُعداً / 16-dimensional affective vector
}

// الأوزان الافتراضية — تُستخدم للمستخدمين الجدد
// Default weights — used for new users with no history
export const DEFAULT_WEIGHTS: UserWeights = {
  w1: 0.3, // التفاعلات (الأهم) / Interactions (most important)
  w2: 0.25, // إكمال المشاهدة / Watch completion
  w3: 0.2, // تشابه المحتوى / Content similarity
  w4: 0.1, // الإشارات الاجتماعية / Social signals
  w5: 0.1, // سجل المستخدم / User history
  w6: 0.05, // تطابق التوقيت / Timing match
};

// نقاط كل نوع تفاعل — الإيجابية تزيد النتيجة، السلبية تنقصها
// Points for each interaction type — positive increases score, negative decreases
export const INTERACTION_POINTS: Record<InteractionType, number> = {
  VIEW: 0.5,
  LIKE: 1,
  COMMENT: 2,
  SHARE: 3,
  SAVE: 4,
  SCROLL_PAST: -0.5,
  REWATCH: 2,
  COMPLETE_WATCH: 3,
};

// ثوابت التلاشي — k لكل نوع محتوى
// Decay constants — k for each content type
export const DECAY_CONSTANTS: Record<ContentType, number> = {
  REEL: 0.1, // الريلز يتلاشى بسرعة / Reels decay faster
  POST: 0.02, // المنشورات تدوم أطول / Posts last longer
  STORY: 0.5, // القصص تنتهي خلال ٢٤ ساعة / Stories expire in 24h
};

// نسبة الاستكشاف — ٥٪ من الخلاصة عشوائية لاكتشاف محتوى جديد
// Exploration rate — 5% of feed is random for discovering new content
export const EXPLORATION_RATE = 0.05;

// الأبعاد العاطفية للتضمين (١٦ فئة عاطفية)
// Affective embedding dimensions (16 emotional categories)
export const AFFECTIVE_DIMENSIONS = [
  'excitement', // إثارة
  'nostalgia', // حنين
  'curiosity', // فضول
  'relaxation', // استرخاء
  'amusement', // مرح
  'surprise', // مفاجأة
  'comfort', // راحة
  'adventure', // مغامرة
  'romance', // رومانسية
  'energy', // طاقة
  'calm', // هدوء
  'inspiration', // إلهام
  'hunger', // جوع
  'satisfaction', // إشباع
  'social', // اجتماعي
  'luxury', // فخامة
] as const;

// الفئات المعروفة في النظام
// Known categories in the system
export const CONTENT_CATEGORIES = [
  'مطاعم',
  'كافيهات',
  'حلويات',
  'وجبات سريعة',
  'مأكولات بحرية',
  'مشويات',
  'مقبلات',
  'عروض',
  'فعاليات',
  'أطباق مميزة',
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
