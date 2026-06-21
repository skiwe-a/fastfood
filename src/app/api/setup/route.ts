// ============================================================
// One-time Setup — Creates tables & seeds database
// Visit: /api/setup (DELETE THIS FILE AFTER USE!)
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1) Check if tables exist
    try {
      await db.$queryRaw`SELECT COUNT(*) FROM "User"`;
      results.push('Tables already exist, checking admin user...');
    } catch {
      results.push('Tables may not exist yet. If seed fails, run: npx prisma db push');
    }

    // 2) Create Admin User
    try {
      const existingAdmin = await db.user.findUnique({
        where: { email: 'admin@sudanrestaurants.sd' },
      });

      if (existingAdmin) {
        results.push('Admin user already exists');
      } else {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await db.user.create({
          data: {
            name: 'مدير المنصة',
            email: 'admin@sudanrestaurants.sd',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            isFrozen: false,
          },
        });
        results.push('Admin user created: admin@sudanrestaurants.sd / admin123');
      }
    } catch (err: any) {
      errors.push(`Admin creation failed: ${err.message}`);
    }

    // 3) Create test customer
    try {
      const existingCustomer = await db.user.findUnique({
        where: { email: 'customer@test.sd' },
      });

      if (existingCustomer) {
        results.push('Test customer already exists');
      } else {
        const hashedPassword = await bcrypt.hash('password123', 12);
        await db.user.create({
          data: {
            name: 'عميل تجريبي',
            email: 'customer@test.sd',
            password: hashedPassword,
            role: 'CUSTOMER',
            isActive: true,
            isFrozen: false,
          },
        });
        results.push('Test customer created: customer@test.sd / password123');
      }
    } catch (err: any) {
      errors.push(`Customer creation failed: ${err.message}`);
    }

    // 4) Create Platform Settings
    try {
      const settingsCount = await db.platformSetting.count();
      if (settingsCount === 0) {
        await db.platformSetting.createMany({
          data: [
            { key: 'platform_name', value: 'FASTfood' },
            { key: 'platform_description', value: 'منصة المطاعم السودانية الأولى' },
            { key: 'commission_rate', value: '0.05' },
            { key: 'min_order_value', value: '0' },
            { key: 'max_restaurants_per_user', value: '3' },
            { key: 'maintenance_mode', value: 'false' },
            { key: 'feature_stories_enabled', value: 'true' },
            { key: 'feature_reels_enabled', value: 'true' },
            { key: 'default_currency', value: 'SDG' },
            { key: 'default_language', value: 'ar' },
            { key: 'admin_whatsapp', value: '+249123456000' },
          ],
          skipDuplicates: true,
        });
        results.push('Platform settings created');
      } else {
        results.push('Platform settings already exist');
      }
    } catch (err: any) {
      errors.push(`Settings failed: ${err.message}`);
    }

    // 5) Create sample restaurants
    const sampleRestaurants = [
      {
        email: 'sultan@restaurant.sd',
        password: 'password123',
        name: 'سلطان المشويات',
        slug: 'sultan-grill',
        restaurantName: 'سلطان المشويات',
        description: 'أفضل مشويات في الخرطوم منذ 2015',
        phone: '+249123456001',
        whatsapp: '+249123456001',
        address: 'شارع النيل، الخرطوم',
        city: 'الخرطوم',
        area: 'النيلين',
        category: 'مشويات',
        cuisineType: 'مشويات سودانية',
        openingHours: '11:00 - 23:00',
        deliveryAvailable: true,
      },
      {
        email: 'golden@kebab.sd',
        password: 'password123',
        name: 'مطعم الكباب الذهبي',
        slug: 'golden-kebab',
        restaurantName: 'الكباب الذهبي',
        description: 'كباب أصلي بطريقة أم درمانية',
        phone: '+249123456002',
        whatsapp: '+249123456002',
        address: 'سوق أم درمان، أم درمان',
        city: 'أم درمان',
        area: 'المحلة',
        category: 'مشويات',
        cuisineType: 'كباب',
        openingHours: '10:00 - 00:00',
        deliveryAvailable: true,
      },
      {
        email: 'nil@sweets.sd',
        password: 'password123',
        name: 'حلويات النيل',
        slug: 'nil-sweets',
        restaurantName: 'حلويات النيل',
        description: 'حلويات شرقية وغربية فاخرة',
        phone: '+249123456003',
        whatsapp: '+249123456003',
        address: 'شارع البلدية، الخرطوم بحري',
        city: 'الخرطوم بحري',
        category: 'حلويات',
        cuisineType: 'حلويات شرقية وغربية',
        openingHours: '08:00 - 23:00',
        deliveryAvailable: true,
      },
      {
        email: 'cafe@khartoum.sd',
        password: 'password123',
        name: 'كافيه الخرطوم',
        slug: 'khartoum-cafe',
        restaurantName: 'كافيه الخرطوم',
        description: 'أجواء هادئة مع أفضل القهوة السودانية',
        phone: '+249123456004',
        whatsapp: '+249123456004',
        address: 'شارع الجمهورية، الخرطوم',
        city: 'الخرطوم',
        area: 'الجمهورية',
        category: 'كافيهات',
        cuisineType: 'قهوة ومشروبات',
        openingHours: '07:00 - 01:00',
        deliveryAvailable: false,
      },
    ];

    for (const rest of sampleRestaurants) {
      try {
        const exists = await db.user.findUnique({ where: { email: rest.email } });
        if (exists) {
          results.push(`Restaurant "${rest.restaurantName}" already exists`);
          continue;
        }

        const hashedPassword = await bcrypt.hash(rest.password, 12);
        const user = await db.user.create({
          data: {
            name: rest.name,
            email: rest.email,
            password: hashedPassword,
            role: 'RESTAURANT',
            isActive: true,
            isFrozen: false,
          },
        });

        await db.restaurantProfile.create({
          data: {
            userId: user.id,
            slug: rest.slug,
            restaurantName: rest.restaurantName,
            description: rest.description,
            phone: rest.phone,
            whatsapp: rest.whatsapp,
            address: rest.address,
            city: rest.city,
            area: rest.area || null,
            category: rest.category,
            cuisineType: rest.cuisineType,
            openingHours: rest.openingHours,
            deliveryAvailable: rest.deliveryAvailable,
            isVerified: true,
            isActive: true,
          },
        });

        results.push(`Restaurant "${rest.restaurantName}" created (${rest.email})`);
      } catch (err: any) {
        errors.push(`Restaurant "${rest.restaurantName}" failed: ${err.message}`);
      }
    }

    // 6) Create sample subscription plans
    try {
      const plansCount = await db.subscriptionPlan.count();
      if (plansCount === 0) {
        await db.subscriptionPlan.createMany({
          data: [
            { name: 'مجاني', nameEn: 'Free', price: 0, currency: 'SDG', duration: 30, durationUnit: 'DAY', features: 'basic_listing', isActive: true },
            { name: 'أساسي', nameEn: 'Basic', price: 5000, currency: 'SDG', duration: 30, durationUnit: 'DAY', features: 'basic_listing,posts,reviews', isActive: true },
            { name: 'احترافي', nameEn: 'Pro', price: 15000, currency: 'SDG', duration: 30, durationUnit: 'DAY', features: 'basic_listing,posts,reviews,stories,reels,analytics', isActive: true },
            { name: 'مميز', nameEn: 'Premium', price: 30000, currency: 'SDG', duration: 30, durationUnit: 'DAY', features: 'all_features,priority_support,verified_badge', isActive: true },
          ],
          skipDuplicates: true,
        });
        results.push('Subscription plans created');
      } else {
        results.push('Subscription plans already exist');
      }
    } catch (err: any) {
      errors.push(`Plans failed: ${err.message}`);
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 'Setup completed!' : 'Setup completed with some errors',
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Setup failed — make sure you ran: npx prisma db push',
      error: err.message,
      hint: 'Go to Neon Dashboard > SQL Editor > run: SELECT 1; to verify connection',
    }, { status: 500 });
  }
}
