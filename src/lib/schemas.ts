// ============================================================
// Zod Validation Schemas — مركزية لكل API routes
// Centralized Zod Schemas for All API Routes
// ============================================================

import { z } from 'zod';

// ===========================
// أنواع مشتركة / Shared types
// ===========================

const emailSchema = z
  .string()
  .email('بريد إلكتروني غير صالح')
  .max(254)
  .transform((e) => e.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً')
  .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');

const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-]{8,20}$/, 'رقم هاتف غير صالح')
  .optional()
  .or(z.literal(''));

const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-zA-Z0-9\u0621-\u064A-]+$/, 'slug غير صالح');

const urlSchema = z
  .string()
  .url('رابط غير صالح')
  .max(2048)
  .optional()
  .or(z.literal(''));

// ===========================
// Auth Schemas
// ===========================

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جداً').max(80, 'الاسم طويل جداً'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['CUSTOMER', 'RESTAURANT']).optional().default('CUSTOMER'),
  phone: phoneSchema,

  // حقول المطعم (مطلوبة فقط إذا role = RESTAURANT)
  restaurantName: z.string().trim().min(2).max(120).optional(),
  whatsapp: z.string().regex(/^\+?[\d\s-]{8,20}$/).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  city: z.string().trim().min(2).max(60).optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'RESTAURANT') {
    if (!data.restaurantName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['restaurantName'], message: 'اسم المطعم مطلوب' });
    }
    if (!data.whatsapp) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['whatsapp'], message: 'واتساب مطلوب' });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'التصنيف مطلوب' });
    }
    if (!data.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'المدينة مطلوبة' });
    }
  }
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: passwordSchema,
});

// ===========================
// Content Schemas
// ===========================

export const createPostSchema = z.object({
  content: z.string().trim().min(1, 'المحتوى مطلوب').max(5000),
  type: z.enum(['OFFER', 'PROMOTION', 'NEWS', 'EVENT']).optional().default('OFFER'),
  mediaUrls: z.array(urlSchema).max(10).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const createReelSchema = z.object({
  caption: z.string().trim().min(1).max(2000),
  videoUrl: z.string().url().max(2048),
  thumbnailUrl: urlSchema,
  duration: z.number().positive().max(600).optional(), // بالثواني، حد أقصى 10 دقائق
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const createStorySchema = z.object({
  content: z.string().trim().max(500).optional(),
  mediaUrl: z.string().url().max(2048),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  duration: z.number().positive().max(30).optional().default(15), // ثواني
  link: urlSchema,
});

// ===========================
// Interaction Schemas
// ===========================

export const likeSchema = z.object({
  targetType: z.enum(['POST', 'REEL', 'STORY', 'MENU_ITEM', 'SERVICE', 'COMMENT']),
  targetId: z.number().int().positive(),
});

export const ratingSchema = z.object({
  targetType: z.enum(['POST', 'REEL', 'MENU_ITEM', 'SERVICE', 'RESTAURANT']),
  targetId: z.number().int().positive(),
  value: z.number().min(1).max(5),
});

export const reviewSchema = z.object({
  restaurantId: z.number().int().positive(),
  comment: z.string().trim().min(10, 'المراجعة قصيرة جداً').max(2000),
  rating: z.number().min(1).max(5),
});

export const commentSchema = z.object({
  postId: z.number().int().positive(),
  content: z.string().trim().min(1).max(1000),
  parentId: z.number().int().positive().optional(),
});

export const followSchema = z.object({
  restaurantId: z.number().int().positive(),
});

// ===========================
// Interaction Recording Schema (للـ EFS)
// ===========================

export const interactionSchema = z.object({
  contentId: z.number().int().positive(),
  contentType: z.enum(['REEL', 'POST', 'STORY']),
  interactionType: z.enum([
    'VIEW', 'LIKE', 'COMMENT', 'SHARE', 'SAVE',
    'SCROLL_PAST', 'REWATCH', 'COMPLETE_WATCH'
  ]),
  watchDuration: z.number().nonnegative().max(86400).optional(), // حد أقصى 24 ساعة
  totalDuration: z.number().nonnegative().max(86400).optional(),
  scrollVelocity: z.number().nonnegative().max(10000).optional(),
  sessionDuration: z.number().nonnegative().max(86400).optional(),
}).superRefine((data, ctx) => {
  // إذا كان التفاعل من نوع مشاهدة، يجب وجود totalDuration
  if (
    (data.interactionType === 'VIEW' ||
      data.interactionType === 'COMPLETE_WATCH' ||
      data.interactionType === 'REWATCH') &&
    data.totalDuration !== undefined &&
    data.watchDuration !== undefined &&
    data.watchDuration > data.totalDuration
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['watchDuration'],
      message: 'مدة المشاهدة لا يمكن أن تتجاوز المدة الإجمالية',
    });
  }
});

// ===========================
// Restaurant Profile Schemas
// ===========================

export const updateRestaurantProfileSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  whatsapp: z.string().regex(/^\+?[\d\s-]{8,20}$/).optional(),
  phone: phoneSchema,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().min(2).max(60).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  cuisineType: z.string().trim().max(60).optional(),
  openingHours: z.string().trim().max(100).optional(),
  logo: urlSchema,
  coverImage: urlSchema,
  isVerified: z.boolean().optional(), // admin only
  isActive: z.boolean().optional(),
});

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  price: z.number().nonnegative().max(100000),
  category: z.string().trim().min(1).max(60),
  imageUrl: urlSchema,
  isAvailable: z.boolean().optional().default(true),
  isVegetarian: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  calories: z.number().int().nonnegative().max(10000).optional(),
  preparationTime: z.number().int().positive().max(240).optional(), // دقائق
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// ===========================
// Search Schema
// ===========================

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(['restaurants', 'posts', 'reels', 'menu_items', 'all']).optional().default('all'),
  city: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  page: z.number().int().positive().max(1000).optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

// ===========================
// Pagination Schema
// ===========================

export const paginationSchema = z.object({
  page: z.number().int().positive().max(1000).optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ===========================
// Admin Schemas
// ===========================

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: emailSchema.optional(),
  role: z.enum(['CUSTOMER', 'RESTAURANT', 'ADMIN', 'DELIVERY']).optional(),
  phone: phoneSchema,
  isActive: z.boolean().optional(),
  isFrozen: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
  isVerified: z.boolean().optional(), // for restaurant profile
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'يجب تمرير حقل واحد على الأقل للتحديث' }
);

// ===========================
// Helper: withValidation middleware
// ===========================

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>, body: unknown):
  | { success: true; data: T }
  | { success: false; response: NextResponse } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'بيانات غير صالحة',
          details: parsed.error.flatten().fieldErrors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: parsed.data };
}

export function validateQuery<T>(schema: ZodSchema<T>, searchParams: URLSearchParams):
  | { success: true; data: T }
  | { success: false; response: NextResponse } {
  const obj: Record<string, any> = {};
  for (const [key, value] of searchParams.entries()) {
    // محاولة تحويل الأرقام
    if (/^-?\d+$/.test(value)) {
      obj[key] = parseInt(value, 10);
    } else if (/^(true|false)$/.test(value)) {
      obj[key] = value === 'true';
    } else {
      obj[key] = value;
    }
  }
  return validateBody(schema, obj);
}
