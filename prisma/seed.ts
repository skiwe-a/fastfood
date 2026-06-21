import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

const restaurants = [
  {
    name: "سلطان المشويات",
    email: "sultan@restaurant.sd",
    password: "password123",
    slug: "sultan-grill",
    restaurantName: "سلطان المشويات",
    description: "أفضل مشويات في الخرطوم منذ 2015. لحم طازج مشوي على الفحم مع بهارات سودانية أصلية.",
    whatsapp: "+249123456001",
    phone: "+249123456001",
    address: "شارع النيل، الخرطوم",
    city: "الخرطوم",
    area: "النيلين",
    category: "مشويات",
    cuisineType: "مشويات سودانية",
    openingHours: "11:00 - 23:00",
    deliveryAvailable: true,
    isVerified: true,
  },
  {
    name: "مطعم الكباب الذهبي",
    email: "golden@kebab.sd",
    password: "password123",
    slug: "golden-kebab",
    restaurantName: "الكباب الذهبي",
    description: "كباب أصلي بطريقة أم درمانية. شهادة عملاء منذ أكثر من 8 سنوات.",
    whatsapp: "+249123456002",
    phone: "+249123456002",
    address: "سوق أم درمان، أم درمان",
    city: "أم درمان",
    area: "المحلة",
    category: "مشويات",
    cuisineType: "كباب",
    openingHours: "10:00 - 00:00",
    deliveryAvailable: true,
    isVerified: true,
  },
  {
    name: "حلويات النيل",
    email: "nil@sweets.sd",
    password: "password123",
    slug: "nil-sweets",
    restaurantName: "حلويات النيل",
    description: "حلويات شرقية وغربية فاخرة. كنافة، بقلاوة، تشيز كيك وغيرها الكثير.",
    whatsapp: "+249123456003",
    phone: "+249123456003",
    address: "شارع البلدية، الخرطوم بحري",
    city: "الخرطوم بحري",
    category: "حلويات",
    cuisineType: "حلويات شرقية وغربية",
    openingHours: "08:00 - 23:00",
    deliveryAvailable: true,
    isVerified: true,
  },
  {
    name: "كافيه الخرطوم",
    email: "cafe@khartoum.sd",
    password: "password123",
    slug: "khartoum-cafe",
    restaurantName: "كافيه الخرطوم",
    description: "أجواء هادئة مع أفضل القهوة السودانية والشاي والوجبات الخفيفة.",
    whatsapp: "+249123456004",
    phone: "+249123456004",
    address: "شارع الجمهورية، الخرطوم",
    city: "الخرطوم",
    area: "الجمهورية",
    category: "كافيهات",
    cuisineType: "قهوة ومشروبات",
    openingHours: "07:00 - 01:00",
    deliveryAvailable: false,
    isVerified: true,
  },
  {
    name: "بيت الفول السوداني",
    email: "ful@sudanese.sd",
    password: "password123",
    slug: "sudanese-ful",
    restaurantName: "بيت الفول السوداني",
    description: "الطبق السوداني الأصلي: فول مدمس، كريك، عصيدة، ومأكولات شعبية.",
    whatsapp: "+249123456005",
    phone: "+249123456005",
    address: "سوق ليبيا، أم درمان",
    city: "أم درمان",
    area: "ليبيا",
    category: "سوداني",
    cuisineType: "مأكولات سودانية تقليدية",
    openingHours: "05:00 - 14:00",
    deliveryAvailable: false,
    isVerified: true,
  },
  {
    name: "مطعم البحر الأحمر",
    email: "red@seafood.sd",
    password: "password123",
    slug: "red-sea-restaurant",
    restaurantName: "البحر الأحمر",
    description: "أطباق بحرية طازجة: سمك مشوي، جمبري، كاليماري وأكثر.",
    whatsapp: "+249123456006",
    phone: "+249123456006",
    address: "شارع البحر، الخرطوم",
    city: "الخرطوم",
    area: "الإبراهيمية",
    category: "بحري",
    cuisineType: "مأكولات بحرية",
    openingHours: "11:00 - 23:00",
    deliveryAvailable: true,
  },
  {
    name: "برجر السودان",
    email: "burger@sudan.sd",
    password: "password123",
    slug: "sudan-burger",
    restaurantName: "برجر السودان",
    description: "وجبات سريعة بلمسة سودانية. برجر، ساندوتشات، بطاطس ومشروبات.",
    whatsapp: "+249123456007",
    phone: "+249123456007",
    address: "شارع النيل، الخرطوم",
    city: "الخرطوم",
    area: "الرياض",
    category: "فاست فود",
    cuisineType: "وجبات سريعة",
    openingHours: "10:00 - 02:00",
    deliveryAvailable: true,
  },
  {
    name: "مطعم الشرق",
    email: "eastern@restaurant.sd",
    password: "password123",
    slug: "eastern-restaurant",
    restaurantName: "مطعم الشرق",
    description: "مأكولات شرقية أصلية: كبسة، مندي، برياني ومطبخ يمني وسعودي.",
    whatsapp: "+249123456008",
    phone: "+249123456008",
    address: "شارع المطار، الخرطوم بحري",
    city: "الخرطوم بحري",
    category: "شرقي",
    cuisineType: "مأكولات شرقية",
    openingHours: "11:00 - 00:00",
    deliveryAvailable: true,
  },
  {
    name: "كافيه الورد",
    email: "rose@cafe.sd",
    password: "password123",
    slug: "rose-cafe",
    restaurantName: "كافيه الورد",
    description: "كافيه أنيق بأجواء رومانسية. قهوة متخصصة، حلويات ووجبات خفيفة.",
    whatsapp: "+249123456009",
    phone: "+249123456009",
    address: "شارع القصر، أم درمان",
    city: "أم درمان",
    area: "القصر",
    category: "كافيهات",
    cuisineType: "كافيه متخصص",
    openingHours: "08:00 - 01:00",
    deliveryAvailable: true,
  },
  {
    name: "تموين الأفراح الملكي",
    email: "royal@catering.sd",
    password: "password123",
    slug: "royal-catering",
    restaurantName: "تموين الأفراح الملكي",
    description: "تموين حفلات وأفراح. وليمة جماعية وحجز طاولات لجميع المناسبات.",
    whatsapp: "+249123456010",
    phone: "+249123456010",
    address: "شارع الأنقاض، الخرطوم",
    city: "الخرطوم",
    area: "الأنقاض",
    category: "تموين",
    cuisineType: "تموين حفلات",
    openingHours: "09:00 - 22:00",
    deliveryAvailable: false,
  },
];

const menuItemsData = [
  // سلطان المشويات (id: 1)
  { rId: 1, name: "مشكل مشويات سلطان", desc: "تشكيلة فاخرة من اللحم والدجاج المشوي على الفحم", price: 3500, cat: "مشويات", popular: true, time: 25 },
  { rId: 1, name: "ريش غنم مشوية", desc: "ريش غنم طازجة مشوية ببهارات خاصة", price: 2800, cat: "مشويات", popular: true, time: 30 },
  { rId: 1, name: "فتة مشويات", desc: "خبز مقرمش مع اللحم المشوي والصلصة", price: 1800, cat: "أطباق رئيسية", time: 15 },
  { rId: 1, name: "كباب لحم", desc: "كباب لحم بقري طازج على أسياخ", price: 1200, cat: "مشويات", popular: true, time: 20 },
  { rId: 1, name: "سلطة خضراء", desc: "خس، طماطم، خيار، بصل مع خلطة سودانية", price: 350, cat: "سلطات", time: 5 },
  { rId: 1, name: "عصير كركدي", desc: "عصير كركدي طبيعي بارد", price: 200, cat: "مشروبات باردة", time: 3 },

  // الكباب الذهبي (id: 2)
  { rId: 2, name: "كباب ذهبي أصلي", desc: "كباب أم درماني أصلي بالبهارات السرية", price: 1500, cat: "مشويات", popular: true, time: 20 },
  { rId: 2, name: "شقف لحم", desc: "لحم مقطع ومشوي على الفحم", price: 2200, cat: "مشويات", time: 25 },
  { rId: 2, name: "سندوتش كباب", desc: "سندوتش كباب في خبز عربي طازج", price: 800, cat: "سندويشات", popular: true, time: 10 },
  { rId: 2, name: "مشويات مشكلة", desc: "طبق مشويات متنوع لشخصين", price: 4500, cat: "مشويات", time: 30 },
  { rId: 2, name: "تميمة حارة", desc: "تميمة بالطماطم والبصل الحار", price: 500, cat: "مقبلات", time: 10 },

  // حلويات النيل (id: 3)
  { rId: 3, name: "كنافة نابلسية", desc: "كنافة بالجبن طازجة يومياً", price: 600, cat: "حلويات", popular: true, time: 15 },
  { rId: 3, name: "بقلاوة فستق", desc: "بقلاوة بالفستق الحلبي", price: 800, cat: "حلويات", popular: true, time: 5 },
  { rId: 3, name: "تشيز كيك", desc: "تشيز كيك فراولة طازج", price: 700, cat: "حلويات", time: 10 },
  { rId: 3, name: "بسبوسة", desc: "بسبوسة بالقشطة", price: 400, cat: "حلويات", time: 5 },
  { rId: 3, name: "قطايف بالجوز", desc: "قطايف محشوة بالجوز ومغماصة", price: 550, cat: "حلويات", time: 10 },
  { rId: 3, name: "بلاك فورست", desc: "كيك الشوكولاتة بلاك فورست", price: 900, cat: "حلويات", time: 15 },
  { rId: 3, name: "موهيتو فراولة", desc: "موهيتو فراولة طازج بالنعناع", price: 350, cat: "مشروبات باردة", time: 5 },
  { rId: 3, name: "قهوة عربية", desc: "قهوة عربية بالهيل والزعفران", price: 200, cat: "مشروبات ساخنة", time: 5 },

  // كافيه الخرطوم (id: 4)
  { rId: 4, name: "قهوة سودانية", desc: "قهوة جبن بالزنجبيل والكركم", price: 250, cat: "مشروبات ساخنة", popular: true, time: 5 },
  { rId: 4, name: "شاي سوداني", desc: "شاي بالنعناع واللبن", price: 150, cat: "مشروبات ساخنة", time: 5 },
  { rId: 4, name: "كيش تايلاندي", desc: "كيش بالدجاج والخضروات", price: 800, cat: "أطباق رئيسية", time: 15 },
  { rId: 4, name: "بان كيك", desc: "بان كيك مع العسل والفاكهة", price: 600, cat: "حلويات", time: 10 },

  // بيت الفول السوداني (id: 5)
  { rId: 5, name: "فول مدمس بالزيت", desc: "فول مدمس طازج بالزيت الحار والليمون", price: 300, cat: "أطباق رئيسية", popular: true, time: 10 },
  { rId: 5, name: "عصيدة بالعسل", desc: "عصيدة سودانية تقليدية بالعسل الأسود", price: 350, cat: "أطباق رئيسية", popular: true, time: 10 },
  { rId: 5, name: "كريك باللبن", desc: "كريك سوداني باللبن الرائب والسكر", price: 400, cat: "أطباق رئيسية", time: 10 },
  { rId: 5, name: "قراص", desc: "قراص سوداني بالعسل", price: 200, cat: "حلويات", time: 5 },
  { rId: 5, name: "شاهي بقراص", desc: "وجبة فول مع قراص وشاي", price: 500, cat: "أطباق رئيسية", time: 10 },

  // البحر الأحمر (id: 6)
  { rId: 6, name: "سمك مشوي كامل", desc: "سمك بلطي مشوي على الفحم مع السلطة", price: 2500, cat: "أطباق رئيسية", popular: true, time: 30 },
  { rId: 6, name: "جمبري مشوي", desc: "جمبري طازج مشوي بالثوم والزبدة", price: 3000, cat: "أطباق رئيسية", popular: true, time: 20 },
  { rId: 6, name: "كاليماري مقلي", desc: "حبار مقلي مقرمش بصلصة الترتر", price: 1800, cat: "مقبلات", time: 15 },
  { rId: 6, name: "فتة سمك", desc: "فتة بالسمك المشوي والصلصة", price: 1200, cat: "أطباق رئيسية", time: 15 },
  { rId: 6, name: "سلطة سي فود", desc: "سلطة فراينة مع الجمبري والأكتوبوس", price: 2200, cat: "سلطات", time: 10 },
  { rId: 6, name: "مشوي بحري مشكل", desc: "طبق مشويات بحرية متنوعة", price: 5000, cat: "أطباق رئيسية", time: 30 },

  // برجر السودان (id: 7)
  { rId: 7, name: "برجر كلاسيك", desc: "لحم بقري مشوي، جبن، خس، طماطم، صوص خاص", price: 1200, cat: "سندويشات", popular: true, time: 10 },
  { rId: 7, name: "برجر دجاج كرسبي", desc: "دجاج مقرمش مع صوص المايونيز الحار", price: 1000, cat: "سندويشات", popular: true, time: 8 },
  { rId: 7, name: "بيتزا بيبروني", desc: "عجينة رقيقة، صوص طماطم، موزاريلا، بيبروني", price: 1800, cat: "أطباق رئيسية", time: 20 },
  { rId: 7, name: "بطاطس مقلية XL", desc: "بطاطس ذهبية مقرمشة بالبهارات", price: 500, cat: "مقبلات", time: 5 },
  { rId: 7, name: "كولا كبير", desc: "مشروب غازي بارد", price: 200, cat: "مشروبات باردة", time: 2 },

  // مطعم الشرق (id: 8)
  { rId: 8, name: "كبسة لحم", desc: "كبسة لحم بالأرز البسمتي والبهارات", price: 2500, cat: "أطباق رئيسية", popular: true, time: 35 },
  { rId: 8, name: "مندي دجاج", desc: "مندي دجاج بالأرز والبهارات اليمنية", price: 2000, cat: "أطباق رئيسية", time: 40 },
  { rId: 8, name: "برياني جمبري", desc: "برياني بالجمبري والبهارات الهندية", price: 2800, cat: "أطباق رئيسية", time: 30 },
  { rId: 8, name: "فتة حمص", desc: "فتة حمص بالزبدة والصنوبر", price: 800, cat: "مقبلات", time: 10 },
  { rId: 8, name: "شاي يمني", desc: "شاي يمني بالحليب والهيل", price: 150, cat: "مشروبات ساخنة", time: 5 },

  // كافيه الورد (id: 9)
  { rId: 9, name: "لاتيه ورد", desc: "لاتيه بنكهة الورد الطبيعية", price: 400, cat: "مشروبات ساخنة", popular: true, time: 5 },
  { rId: 9, name: "تيراميسو", desc: "تيراميسو إيطالي أصلي", price: 700, cat: "حلويات", time: 10 },
  { rId: 9, name: "كرواسون", desc: "كرواسون طازج بالزبدة الفرنسية", price: 350, cat: "أطباق رئيسية", time: 8 },
  { rId: 9, name: "سموذي مانجو", desc: "سموذي مانجو طازج بالحليب", price: 450, cat: "مشروبات باردة", time: 5 },

  // تموين الأفراح الملكي (id: 10)
  { rId: 10, name: "وليمة ملكية 50 شخص", desc: "وليمة كاملة تشمل: مشويات، أرز، سلطات، حلويات", price: 150000, cat: "أطباق رئيسية", popular: true, time: 120 },
  { rId: 10, name: "وليمة عشاء 30 شخص", desc: "عشاء فاخر لـ 30 ضيف", price: 90000, cat: "أطباق رئيسية", time: 90 },
  { rId: 10, name: "حلويات مناسبات", desc: "تشكيلة حلويات شرقية لـ 50 شخص", price: 25000, cat: "حلويات", time: 60 },
];

const servicesData = [
  // سلطان المشويات
  { rId: 1, name: "توصيل منزلي", desc: "نوصل مشوياتك الطازجة إلى باب بيتك", cat: "توصيل منزلي" },
  { rId: 1, name: "حجز طاولات", desc: "احجز طاولتك مسبقاً وتجنب الانتظار", cat: "حجز طاولات" },
  // الكباب الذهبي
  { rId: 2, name: "توصيل منزلي", desc: "نوصل كبابك الساخن خلال 45 دقيقة", cat: "توصيل منزلي" },
  { rId: 2, name: "عرض خاص الأربعاء", desc: "خصم 20% على جميع أصناف الكباب", cat: "عرض خاص", price: 0 },
  // حلويات النيل
  { rId: 3, name: "طلبات مناسبات", desc: "حلويات مخصصة للمناسبات والأعراس", cat: "تموين حفلات", price: 5000 },
  // كافيه الخرطوم
  { rId: 4, name: "حجز طاولات", desc: "احجز مكانك في الكافيه", cat: "حجز طاولات" },
  { rId: 4, name: "إقامة فعالية", desc: "نستضيف حفلاتك وفعالياتك", cat: "إقامة فعالية", price: 3000 },
  { rId: 4, name: "توصيل منزلي", desc: "نوصل طلبك خلال ساعة", cat: "توصيل منزلي" },
  // بيت الفول السوداني
  { rId: 5, name: "وليمة جماعية", desc: "وليمة فول وكريك لجماعات العمل", cat: "وليمة جماعية", price: 2000 },
  { rId: 5, name: "توصيل صباحي", desc: "فطور سوداني يتوصل لباب بيتك", cat: "توصيل منزلي" },
  // البحر الأحمر
  { rId: 6, name: "توصيل منزلي", desc: "نوصل الأطباق البحرية الطازجة", cat: "توصيل منزلي" },
  { rId: 6, name: "عرض الجمعة", desc: "خصم 15% يوم الجمعة", cat: "عرض خاص" },
  // برجر السودان
  { rId: 7, name: "توصيل سريع", desc: "توصيل خلال 30 دقيقة أو مجاناً", cat: "توصيل منزلي" },
  { rId: 7, name: "عرض Combo", desc: "برجر + بطاطس + مشروب بسعر خاص", cat: "عرض خاص", price: 1500 },
  { rId: 7, name: "حجز طاولات", desc: "احجز مكانك للعائلة والأصدقاء", cat: "حجز طاولات" },
  // مطعم الشرق
  { rId: 8, name: "توصيل منزلي", desc: "نوصل الوجبات الشرقية الساخنة", cat: "توصيل منزلي" },
  { rId: 8, name: "تموين حفلات", desc: "كبسة ومندي لجميع المناسبات", cat: "تموين حفلات", price: 8000 },
  // كافيه الورد
  { rId: 9, name: "حجز طاولات", desc: "احجز مكانك الهادئ مسبقاً", cat: "حجز طاولات" },
  { rId: 9, name: "إقامة فعالية", desc: "مساحة لكافيه للورش والفعاليات", cat: "إقامة فعالية", price: 2000 },
  // تموين الأفراح الملكي
  { rId: 10, name: "تموين أفراح كامل", desc: "تموين شامل للأفراح والمناسبات الكبيرة", cat: "تموين حفلات", price: 50000 },
  { rId: 10, name: "وليمة جماعية", desc: "وليمة جماعية للشركات والمؤسسات", cat: "وليمة جماعية", price: 15000 },
  { rId: 10, name: "حجز طاولات", desc: "قاعة مخصصة للمناسبات", cat: "حجز طاولات", price: 5000 },
  { rId: 10, name: "عرض شهر العسل", desc: "باقة خاصة للعروسين", cat: "عرض خاص", price: 20000 },
];

const postsData = [
  // سلطان المشويات
  { rId: 1, content: "🔥 عرض نهاية الأسبوع! مشكل مشويات لشخصين بسعر واحد. لا تفوتوا الفرصة!", type: "OFFER" as const, discount: 50 },
  { rId: 1, content: "لحم غنم طازج وصل اليوم مباشرة من المزرعة. جربوا ريش الغنم المشوية!", type: "NEWS" as const },
  { rId: 1, content: "طبق اليوم: فتة مشويات مع عصير كركدي مجاني. اطلبوا الآن عبر واتساب!", type: "DAILY_SPECIAL" as const },
  // الكباب الذهبي
  { rId: 2, content: "كباب الذهبي يحتفل بمرور 8 سنوات! خصم 30% على كل الطلبات هذا الأسبوع 🎉", type: "EVENT" as const, discount: 30 },
  { rId: 2, content: "جديد: سندوتش كباب بالجبن الذائب. جربوه وأخبرونا رأيكم!", type: "NEWS" as const },
  // حلويات النيل
  { rId: 3, content: "كنافة نابلسية طازجة كل صباح! اطلبي الآن بالواتساب. التوصيل مجاني للطلبات فوق 2000 ج.س", type: "DAILY_SPECIAL" as const },
  { rId: 3, content: "🍰 مناسباتكم قادمة؟ اطلبوا تشكيلة حلويات مخصصة من حلويات النيل. خصم 15% للحجوزات المبكرة!", type: "OFFER" as const, discount: 15 },
  // كافيه الخرطوم
  { rId: 4, content: "مساء الخير ☕ قهوة سودانية بالزنجبيل والكركم - أحسن مشروب شتوي!", type: "DAILY_SPECIAL" as const },
  { rId: 4, content: "ناستضيف ليلة شعرية وموسيقى الخميس القادم. احجزوا أماكنكم الآن!", type: "EVENT" as const },
  { rId: 4, content: "كيش تايلاندي جديد أضفناه للقائمة. جربوه مع قهوة سودانية!", type: "NEWS" as const },
  // بيت الفول السوداني
  { rId: 5, content: "فطور سوداني أصيل كل يوم من الساعة 5 صباحاً! فول، كريك، عصيدة وقراص طازج ☀️", type: "DAILY_SPECIAL" as const },
  { rId: 5, content: "وليمة جماعية للشركات: 200 ج.س للشخص تشمل كل شيء. تواصلوا معنا!", type: "OFFER" as const },
  // البحر الأحمر
  { rId: 6, content: "سمك بلطي طازج وصل من النيل الأزرق اليوم! طلبي الآن وسيتم تحضيره فوراً 🐟", type: "NEWS" as const },
  { rId: 6, content: "عرض الجمعة: مشوي بحري مشكل لشخصين بسعر 4000 ج.س بدلاً من 5000 ج.س!", type: "OFFER" as const, discount: 20 },
  // برجر السودان
  { rId: 7, content: "🍔 عرض Combo: برجر + بطاطس + مشروب بـ 1500 ج.س فقط! العرض ساري حتى نهاية الشهر", type: "OFFER" as const },
  { rId: 7, content: "برجر دجاج كرسبي الجديد أصبح متوفراً! جربوه وقيموه ⭐", type: "NEWS" as const },
  { rId: 7, content: "التوصيل خلال 30 دقيقة أو مجاناً! خدمة التوصيل السريع متاحة الآن 🚀", type: "NEWS" as const },
  // مطعم الشرق
  { rId: 8, content: "كبسة لحم بالمكسرات - وصفة رمضانية خاصة! اطلبوا الآن 🍛", type: "DAILY_SPECIAL" as const },
  { rId: 8, content: "خدمة تموين حفلات متاحة الآن! كبسة ومندي لجميع المناسبات بأفضل الأسعار.", type: "NEWS" as const },
  // كافيه الورد
  { rId: 9, content: "لاتيه بنكهة الورد الطبيعية - مشروب الموسم! ☕🌸", type: "NEWS" as const },
  { rId: 9, content: "مساحة الكافيه متاحة للورش والفعاليات الصغيرة. تواصلوا معنا للحجز!", type: "EVENT" as const },
  // تموين الأفراح الملكي
  { rId: 10, content: "عرض شهر العسل: باقة خاصة للعروسين شاملة وليمة + حلويات + زينة!", type: "OFFER" as const },
  { rId: 10, content: "تموين موسم الأعراس مفتوح! احجزوا مبكراً واحصلوا على خصم 10%", type: "NEWS" as const },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clean database
  await prisma.$transaction([
    prisma.like.deleteMany(),
    prisma.rating.deleteMany(),
    prisma.review.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.offerPost.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.service.deleteMany(),
    prisma.restaurantProfile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.platformSetting.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.userSubscription.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      name: 'مدير المنصة',
      email: 'admin@sudanrestaurants.sd',
      password: await hashPassword('admin123'),
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created');

  // Create restaurant users and profiles - collect IDs for FK references
  const profileIds: number[] = [];
  for (const rest of restaurants) {
    const user = await prisma.user.create({
      data: {
        name: rest.name,
        email: rest.email,
        password: await hashPassword(rest.password),
        role: 'RESTAURANT',
      },
    });

    const profile = await prisma.restaurantProfile.create({
      data: {
        userId: user.id,
        slug: rest.slug,
        restaurantName: rest.restaurantName,
        description: rest.description,
        whatsapp: rest.whatsapp,
        phone: rest.phone || null,
        address: rest.address,
        city: rest.city,
        area: rest.area || null,
        category: rest.category,
        cuisineType: rest.cuisineType || null,
        openingHours: rest.openingHours,
        deliveryAvailable: rest.deliveryAvailable,
        isVerified: rest.isVerified,
        followersCount: Math.floor(Math.random() * 500) + 50,
        ratingsCount: Math.floor(Math.random() * 100) + 10,
        avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      },
    });
    profileIds.push(profile.id);
  }
  console.log('✅ 10 restaurants created');

  // Helper: map 1-based index to actual profile ID
  const rid = (idx: number) => profileIds[idx - 1];

  // Create menu items
  for (const item of menuItemsData) {
    await prisma.menuItem.create({
      data: {
        restaurantId: rid(item.rId),
        name: item.name,
        description: item.desc,
        price: item.price,
        currency: 'SDG',
        category: item.cat,
        isAvailable: true,
        isPopular: item.popular || false,
        preparationTime: item.time,
        likesCount: Math.floor(Math.random() * 50),
        avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        ratingsCount: Math.floor(Math.random() * 30),
      },
    });
  }
  console.log('✅ Menu items created');

  // Create services
  for (const svc of servicesData) {
    await prisma.service.create({
      data: {
        restaurantId: rid(svc.rId),
        name: svc.name,
        description: svc.desc,
        price: svc.price || null,
        currency: 'SDG',
        category: svc.cat,
        isAvailable: true,
        likesCount: Math.floor(Math.random() * 20),
        avgRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        ratingsCount: Math.floor(Math.random() * 15),
      },
    });
  }
  console.log('✅ Services created');

  // Create posts
  for (const post of postsData) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    
    await prisma.offerPost.create({
      data: {
        restaurantId: rid(post.rId),
        content: post.content,
        type: post.type,
        discountPercentage: post.discount || null,
        startDate: post.type === 'OFFER' ? startDate : null,
        endDate: post.type === 'OFFER' ? endDate : null,
        likesCount: Math.floor(Math.random() * 100),
      },
    });
  }
  console.log('✅ Posts created');

  // Create a test customer
  const customerUser = await prisma.user.create({
    data: {
      name: 'عميل تجريبي',
      email: 'customer@test.sd',
      password: await hashPassword('password123'),
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created');

  // Create some follows
  for (let i = 0; i < 5; i++) {
    await prisma.follow.create({
      data: {
        userId: customerUser.id,
        restaurantId: profileIds[i],
      },
    });
  }
  console.log('✅ Follows created');

  // Create some reviews
  const reviewContents = [
    { title: 'ممتاز!', content: 'طعام رائع وخدمة سريعة. أنصح الجميع بتجربة المشويات هنا.', rating: 5 },
    { title: 'جيد جداً', content: 'الأكل لذيذ والأسعار معقولة. سأعود بالتأكيد!', rating: 4 },
    { title: 'تجربة مميزة', content: 'المكان نظيف والأجواء مريحة. البرجر من الأفضل اللي جربته.', rating: 5 },
  ];
  
  for (let i = 0; i < 3; i++) {
    await prisma.review.create({
      data: {
        userId: customerUser.id,
        restaurantId: profileIds[i],
        rating: reviewContents[i].rating,
        title: reviewContents[i].title,
        content: reviewContents[i].content,
        foodRating: reviewContents[i].rating,
        serviceRating: reviewContents[i].rating - (i === 1 ? 0 : 1),
        ambienceRating: reviewContents[i].rating - (i === 0 ? 1 : 0),
        valueRating: reviewContents[i].rating,
      },
    });
  }
  console.log('✅ Reviews created');

  // Create subscription plans
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'مجاني',
        nameEn: 'Free',
        price: 0,
        duration: 365,
        durationUnit: 'DAY',
        features: 'عرض المطعم في المنصة|إضافة 10 أصناف للقائمة|إضافة 3 خدمات|إضافة 5 منشورات|إضافة 3 قصص|عرض معلومات التواصل',
        maxMenuItems: 10,
        maxPosts: 5,
        maxStories: 3,
        maxReels: 1,
        maxServices: 3,
        prioritySupport: false,
        featuredListing: false,
        isActive: true,
        sortOrder: 0,
      },
      {
        name: 'أساسي',
        nameEn: 'Basic',
        price: 5000,
        duration: 30,
        durationUnit: 'DAY',
        features: 'كل مميزات المجاني|إضافة 50 صنف للقائمة|إضافة 10 خدمات|إضافة 20 منشور|إضافة 10 قصص|شارة مطعم موثق|دعم أولوي عبر واتساب',
        maxMenuItems: 50,
        maxPosts: 20,
        maxStories: 10,
        maxReels: 3,
        maxServices: 10,
        prioritySupport: true,
        featuredListing: false,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'مميز',
        nameEn: 'Premium',
        price: 15000,
        duration: 30,
        durationUnit: 'DAY',
        features: 'كل مميزات الأساسي|أصناف وقصص ومنشورات غير محدودة|ظهور في الصفحة الرئيسية|شارة مميز ذهبي|إحصائيات متقدمة|إضافة ريلز فيديو|دعم مخصص على مدار الساعة',
        maxMenuItems: 999,
        maxPosts: 999,
        maxStories: 999,
        maxReels: 10,
        maxServices: 999,
        prioritySupport: true,
        featuredListing: true,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'احترافي',
        nameEn: 'Professional',
        price: 35000,
        duration: 30,
        durationUnit: 'DAY',
        features: 'كل مميزات المميز|ظهور دائم في أعلى النتائج|باقة تسويقية شهرية|تقرير أداء شهري|حساب مدير إضافي|أولوية مطلقة في الدعم|تصميم بانر إعلاني',
        maxMenuItems: 9999,
        maxPosts: 9999,
        maxStories: 9999,
        maxReels: 50,
        maxServices: 9999,
        prioritySupport: true,
        featuredListing: true,
        isActive: true,
        sortOrder: 3,
      },
    ],
  });
  console.log('✅ Subscription plans created');

  // Create sample subscriptions
  const now = new Date();
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 15);
  const expiredDate = new Date(now);
  expiredDate.setDate(expiredDate.getDate() - 5);

  // Restaurant 1 (سلطان المشويات) - ACTIVE Premium subscription
  const restaurant1User = await prisma.user.findFirst({ where: { email: 'sultan@restaurant.sd' } });
  const premiumPlan = await prisma.subscriptionPlan.findFirst({ where: { nameEn: 'Premium' } });
  const basicPlan = await prisma.subscriptionPlan.findFirst({ where: { nameEn: 'Basic' } });

  if (restaurant1User && premiumPlan) {
    await prisma.userSubscription.create({
      data: {
        userId: restaurant1User.id,
        planId: premiumPlan.id,
        status: 'ACTIVE',
        startDate: now,
        endDate: thirtyDaysLater,
        paymentRef: 'TRF-2024-001',
        paymentMethod: 'bank_transfer',
        notes: 'دفع عبر بنك الخرطوم',
      },
    });
  }

  // Restaurant 2 (الكباب الذهبي) - ACTIVE Basic subscription
  const restaurant2User = await prisma.user.findFirst({ where: { email: 'golden@kebab.sd' } });
  if (restaurant2User && basicPlan) {
    await prisma.userSubscription.create({
      data: {
        userId: restaurant2User.id,
        planId: basicPlan.id,
        status: 'ACTIVE',
        startDate: pastDate,
        endDate: thirtyDaysLater,
        paymentRef: 'TRF-2024-002',
        paymentMethod: 'mobile_money',
        notes: 'دفع عبر محفظة ميلي',
      },
    });
  }

  // Restaurant 3 - PENDING subscription (waiting for payment)
  const restaurant3User = await prisma.user.findFirst({ where: { email: 'nil@sweets.sd' } });
  const professionalPlan = await prisma.subscriptionPlan.findFirst({ where: { nameEn: 'Professional' } });
  if (restaurant3User && professionalPlan) {
    await prisma.userSubscription.create({
      data: {
        userId: restaurant3User.id,
        planId: professionalPlan.id,
        status: 'PENDING',
        startDate: now,
        endDate: thirtyDaysLater,
        notes: 'بانتظار التحويل المصرفي',
      },
    });
  }

  // Restaurant 4 - EXPIRED subscription
  const restaurant4User = await prisma.user.findFirst({ where: { email: 'cafe@khartoum.sd' } });
  if (restaurant4User && basicPlan) {
    await prisma.userSubscription.create({
      data: {
        userId: restaurant4User.id,
        planId: basicPlan.id,
        status: 'EXPIRED',
        startDate: pastDate,
        endDate: expiredDate,
        paymentRef: 'TRF-2024-003',
        paymentMethod: 'bank_deposit',
        notes: 'انتهت الخطة',
      },
    });
  }

  console.log('✅ Sample subscriptions created');

  // Create platform settings
  await prisma.platformSetting.createMany({
    data: [
      { key: 'admin_whatsapp', value: '+249123456000' },
      { key: 'platform_name', value: 'FASTfood' },
      { key: 'platform_description', value: 'منصة المطاعم السودانية الأولى' },
    ],
  });
  console.log('✅ Platform settings created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('📧 Admin: admin@sudanrestaurants.sd / admin123');
  console.log('📧 Customer: customer@test.sd / password123');
  console.log('📧 Any restaurant: [email] / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
