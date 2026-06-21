'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useSession, signIn, signOut, getSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search, Heart, Star, MapPin, Phone, Clock, ChevronLeft, ChevronRight,
  Menu, X, Plus, Minus, Trash2, MessageCircle, Check,
  Users, Utensils, Award, Shield, ShoppingCart, Tag,
  BarChart3, Gift, LayoutDashboard, Store, Coffee, Flame, Cookie, Fish,
  Soup, Sandwich, ClipboardList, Send, Image as ImageIcon, Pencil, Trash,
  Video, Camera, Film, Play, Eye, Edit3, Calendar, Hash, Globe,
  ImagePlus, XCircle, Loader2, Share2, CreditCard, CircleDollarSign, Ban, AlertCircle, RefreshCw, Zap
} from 'lucide-react';

const SwiperHero = dynamic(() => import('./SwiperHero'), { ssr: false });
import AOS from 'aos';
import 'aos/dist/aos.css';

/* ============================================================
   TYPES
   ============================================================ */

type ViewType = 'home' | 'menu' | 'about' | 'cart' | 'explore' | 'restaurant' | 'feed' | 'dashboard' | 'admin' | 'plans';

interface FoodItem {
  id: number; name: string; price: number; image: string;
  rating: string; description: string; category: string;
  badge?: string; badgeColor?: string;
}

interface CartItem {
  id: number; name: string; price: number; quantity: number;
  image: string; restaurantName: string; whatsapp: string;
}

interface Restaurant {
  id: number; userId: number; slug: string; restaurantName: string;
  description: string; logo?: string; coverImage?: string; whatsapp: string;
  phone?: string; address: string; city: string; area?: string;
  category: string; cuisineType?: string; openingHours: string;
  deliveryAvailable: boolean; minOrderAmount?: number;
  isVerified: boolean; isActive: boolean;
  followersCount: number; ratingsCount: number; avgRating: number;
  user?: { name: string; image?: string };
  _count?: { followers: number; reviews: number; menuItems?: number; services?: number };
  menuItems?: MenuItem[]; services?: Service[]; offerPosts?: OfferPost[];
}

interface MenuItem {
  id: number; restaurantId: number; name: string; description?: string;
  price: number; currency: string; category: string;
  isAvailable: boolean; isPopular: boolean; isSpicy: boolean;
  preparationTime?: number; likesCount: number; avgRating: number; ratingsCount: number;
  restaurant?: { restaurantName: string; slug: string; whatsapp: string };
}

interface Service {
  id: number; restaurantId: number; name: string; description: string;
  price?: number; currency: string; category: string;
  isAvailable: boolean; likesCount: number; avgRating: number;
}

interface OfferPost {
  id: number; restaurantId: number; content: string; type: string;
  discountPercentage?: number; startDate?: string; endDate?: string;
  likesCount: number; createdAt: string;
  restaurant?: { restaurantName: string; slug: string; logo?: string; city: string; category: string };
}

interface Review {
  id: number; userId: number; restaurantId: number; rating: number;
  title?: string; content: string;
  user?: { name: string; image?: string }; createdAt: string;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  currency: string;
  duration: number;
  durationUnit: string;
  features: string;
  maxMenuItems: number;
  maxPosts: number;
  maxStories: number;
  maxReels: number;
  maxServices: number;
  prioritySupport: boolean;
  featuredListing: boolean;
  isActive: boolean;
  sortOrder: number;
}

/* ============================================================
   CONSTANTS
   ============================================================ */

const foodItems: FoodItem[] = [
  { id: 1, name: 'كلاسيك تشيز برجر', price: 8.50, image: '/images/food/burger.png', rating: '4.9', description: 'لحم بقري مشوي، جبن، طماطم، صوص خاص.', category: 'برجر', badge: 'الأكثر مبيعاً', badgeColor: 'bg-red-100 text-red-600' },
  { id: 2, name: 'مارغريتا بيتزا', price: 14.00, image: '/images/food/pizza.png', rating: '4.7', description: 'عجينة رقيقة، صوص طماطم طازج، موزاريلا، ريحان.', category: 'بيتزا' },
  { id: 3, name: 'ساندوتش كريسبي', price: 9.20, image: '/images/food/sandwich.png', rating: '4.8', description: 'دجاج مقرمش، صوص المايونيز الحار، مخلل.', category: 'برجر', badge: 'جديد', badgeColor: 'bg-green-100 text-green-600' },
  { id: 4, name: 'بطاطس مقلية XL', price: 4.50, image: '/images/food/fries.png', rating: '4.6', description: 'بطاطس ذهبية مقرمشة مع رشة ملح وبهارات.', category: 'مقبلات' },
];

const bgColors = [
  'linear-gradient(135deg, #ffffff 50%, #ffefef 50%, #ff4d4d 100%)',
  'linear-gradient(135deg, #ffffff 50%, #fff4e6 50%, #f59e0b 100%)',
  'linear-gradient(135deg, #ffffff 50%, #f0fdf4 50%, #22c55e 100%)',
];

const categories = ['الكل', 'برجر', 'بيتزا', 'مقبلات', 'مشروبات'];

const cuisineCategories = [
  { id: 'سوداني', label: 'سوداني', icon: <Utensils className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  { id: 'مشويات', label: 'مشويات', icon: <Flame className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  { id: 'فاست فود', label: 'فاست فود', icon: <Sandwich className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
  { id: 'كافيهات', label: 'كافيهات', icon: <Coffee className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  { id: 'حلويات', label: 'حلويات', icon: <Cookie className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
  { id: 'بحري', label: 'بحري', icon: <Fish className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'شرقي', label: 'شرقي', icon: <Soup className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'غربي', label: 'غربي', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
];

const cities = ['الخرطوم', 'أم درمان', 'الخرطوم بحري', 'مدن أخرى'];

const postTypeLabels: Record<string, { label: string; color: string }> = {
  OFFER: { label: 'عرض', color: 'bg-red-100 text-red-700' },
  NEWS: { label: 'خبر', color: 'bg-amber-100 text-amber-700' },
  EVENT: { label: 'حدث', color: 'bg-purple-100 text-purple-700' },
  DAILY_SPECIAL: { label: 'طبق اليوم', color: 'bg-green-100 text-green-700' },
};

/* ============================================================
   CONTEXTS
   ============================================================ */

interface AppState {
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
  session: ReturnType<typeof useSession>['data'];
  restaurants: Restaurant[];
  loading: boolean;
  selectedRestaurant: Restaurant | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedCity: string;
  setSelectedCity: (c: string) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (v: boolean) => void;
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  addToCart: (item: MenuItem, restaurant: Restaurant) => void;
  addToCartStatic: (item: FoodItem) => void;
  cartTotal: number;
  cartCount: number;
  likes: Set<string>;
  follows: Set<number>;
  toggleLike: (targetType: string, targetId: number) => void;
  toggleFollow: (restaurantId: number) => void;
  goToRestaurant: (slug: string) => Promise<void>;
  fetchRestaurants: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/* ============================================================
   APP PROVIDER
   ============================================================ */

function AppProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [follows, setFollows] = useState<Set<number>>(new Set());

  const fetchRestaurants = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCity) params.set('city', selectedCity);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/restaurants?${params.toString()}`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch { console.error('Failed to fetch'); } finally { setLoading(false); }
  }, [selectedCategory, selectedCity, searchQuery]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      AOS.init({ once: false, mirror: true, offset: 80, duration: 1000, easing: 'ease-out-cubic' });
    }
  }, []);

  // Auto-redirect based on session role after NEW login only (not on page refresh)
  const prevSessionRef = useRef(session);
  useEffect(() => {
    const prevSession = prevSessionRef.current;
    prevSessionRef.current = session;
    // Only redirect when session transitions from null to logged-in (new login)
    if (!prevSession && session?.user) {
      if (session.user.role === 'ADMIN') {
        setCurrentView('admin');
      } else if (session.user.role === 'RESTAURANT') {
        setCurrentView('dashboard');
      }
    }
  }, [session, setCurrentView]);

  const addToCart = useCallback((item: MenuItem, restaurant: Restaurant) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: '/images/food/burger.png', restaurantName: restaurant.restaurantName, whatsapp: restaurant.whatsapp }];
    });
    toast.success(`تمت إضافة ${item.name} للسلة`);
  }, []);

  const addToCartStatic = useCallback((item: FoodItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image, restaurantName: 'FASTfood', whatsapp: '+249XXXXXXXXX' }];
    });
    toast.success(`تمت إضافة ${item.name} للسلة`);
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const toggleLike = useCallback(async (targetType: string, targetId: number) => {
    if (!session) { setAuthModalOpen(true); return; }
    const key = `${targetType}-${targetId}`;
    try {
      const res = await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId }) });
      const data = await res.json();
      if (data.liked) { setLikes(prev => new Set(prev).add(key)); toast.success('تم الإعجاب'); }
      else { setLikes(prev => { const n = new Set(prev); n.delete(key); return n; }); }
    } catch { toast.error('حدث خطأ'); }
  }, [session]);

  const toggleFollow = useCallback(async (restaurantId: number) => {
    if (!session) { setAuthModalOpen(true); return; }
    try {
      const res = await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId }) });
      const data = await res.json();
      if (data.followed) { setFollows(prev => new Set(prev).add(restaurantId)); toast.success('تم المتابعة'); }
      else { setFollows(prev => { const n = new Set(prev); n.delete(restaurantId); return n; }); toast.info('تم إلغاء المتابعة'); }
      fetchRestaurants();
    } catch { toast.error('حدث خطأ'); }
  }, [session, fetchRestaurants]);

  const goToRestaurant = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/restaurants/${slug}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedRestaurant(data);
      setCurrentView('restaurant');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { toast.error('خطأ في تحميل المطعم'); }
  }, []);

  const handleSetCurrentView = useCallback((view: ViewType) => {
    if (view === 'home' || view === 'explore') { setSearchQuery(''); setSelectedCategory(''); setSelectedCity(''); }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView: handleSetCurrentView, session,
      restaurants, loading, selectedRestaurant, searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory, selectedCity, setSelectedCity,
      authModalOpen, setAuthModalOpen, cart, setCart, addToCart, addToCartStatic,
      cartTotal, cartCount, likes, follows, toggleLike, toggleFollow, goToRestaurant, fetchRestaurants,
    }}>
      {children}
    </AppContext.Provider>
  );
}

/* ============================================================
   UTILITY COMPONENTS
   ============================================================ */

function StarRating({ rating, max = 5, size = 'sm' }: { rating: number; max?: number; size?: 'sm' | 'md' }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5' };
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`${sizes[size]} ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

/* ============================================================
   HEADER
   ============================================================ */

function Header() {
  const { currentView, setCurrentView, session, cartCount, setAuthModalOpen } = useApp();
  const [mobileMenu, setMobileMenu] = useState(false);

  const navLinks: { label: string; view: ViewType }[] = [
    { label: 'الرئيسية', view: 'home' },
    { label: 'استكشاف', view: 'explore' },
    { label: 'خطط الاشتراك', view: 'plans' },
    { label: 'القائمة', view: 'menu' },
    { label: 'آخر الأخبار', view: 'feed' },
    { label: 'من نحن', view: 'about' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-10 py-4 header-glass transition-all duration-300">
      <div className="flex items-center gap-8">
        <nav className="hidden lg:flex gap-4 font-bold text-gray-800 text-sm">
          {navLinks.map(link => (
            <button key={link.view} onClick={() => setCurrentView(link.view)}
              className={`hover:text-red-600 transition pb-1 ${currentView === link.view ? 'text-red-600 border-b-2 border-red-600' : ''}`}>
              {link.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
        <span className="text-2xl font-black text-gray-900">FAST</span>
        <span className="text-2xl text-red-600 italic" style={{ fontFamily: 'cursive' }}>food</span>
        <div className="bg-black p-1 rounded-md mr-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M11 9H13V11H11V9ZM11 13H13V17H11V13ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" /></svg>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {session ? (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-600 font-bold">{session.user?.name}</span>
            {session.user?.role === 'RESTAURANT' && (
              <button onClick={() => setCurrentView('dashboard')} className="bg-gray-100 hover:bg-red-50 text-gray-700 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
                <LayoutDashboard className="w-3.5 h-3.5" /> لوحة التحكم
              </button>
            )}
            {session.user?.role === 'ADMIN' && (
              <button onClick={() => setCurrentView('admin')} className="bg-gray-100 hover:bg-red-50 text-gray-700 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> الإدارة
              </button>
            )}
            <button onClick={() => signOut()} className="text-gray-500 hover:text-red-600 text-xs font-bold">خروج</button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setAuthModalOpen(true)} className="text-gray-600 hover:text-red-600 text-sm font-bold">دخول</button>
            <button onClick={() => setAuthModalOpen(true)} className="bg-red-600 text-white text-sm px-4 py-2 rounded-full font-bold">حساب جديد</button>
          </div>
        )}
        <button className="hidden md:flex bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2 px-5 rounded-full shadow-lg items-center gap-2 transition text-sm">
          <Phone className="w-4 h-4" /> اطلب الآن
        </button>
        <button className="hover:text-red-600 transition relative" onClick={() => setCurrentView('cart')}>
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-white font-bold">{cartCount}</span>}
        </button>
        <div className="lg:hidden">
          <Sheet open={mobileMenu} onOpenChange={setMobileMenu}>
            <SheetTrigger asChild><button className="p-2 rounded-lg hover:bg-gray-100"><Menu className="w-5 h-5" /></button></SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="text-right text-lg font-black">القائمة</SheetTitle>
              <SheetDescription className="text-right text-gray-500 text-sm">تصفح أقسام المنصة</SheetDescription>
              <div className="flex flex-col gap-2 mt-6">
                {navLinks.map(l => (
                  <button key={l.view} onClick={() => { setCurrentView(l.view); setMobileMenu(false); }}
                    className={`text-right px-4 py-3 rounded-xl font-bold transition ${currentView === l.view ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'}`}>{l.label}</button>
                ))}
                <div className="border-t border-gray-100 my-2" />
                {session && session.user?.role === 'RESTAURANT' && <button onClick={() => { setCurrentView('dashboard'); setMobileMenu(false); }} className="text-right px-4 py-3 rounded-xl hover:bg-red-50 font-bold text-gray-700"><LayoutDashboard className="w-4 h-4 inline ml-2" />لوحة التحكم</button>}
                {session && session.user?.role === 'ADMIN' && <button onClick={() => { setCurrentView('admin'); setMobileMenu(false); }} className="text-right px-4 py-3 rounded-xl hover:bg-red-50 font-bold text-gray-700"><Shield className="w-4 h-4 inline ml-2" />الإدارة</button>}
                {session ? (
                  <button onClick={() => signOut()} className="text-right px-4 py-3 rounded-xl hover:bg-red-50 font-bold text-red-600">خروج ({session.user?.name})</button>
                ) : (
                  <button onClick={() => { setAuthModalOpen(true); setMobileMenu(false); }} className="text-right px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold">تسجيل الدخول</button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   AUTH MODAL
   ============================================================ */

function AuthModal() {
  const { authModalOpen, setAuthModalOpen, setCurrentView } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState('CUSTOMER');
  const [submitting, setSubmitting] = useState(false);

  const handleRedirect = async () => {
    // Small delay to let NextAuth update the session
    await new Promise(r => setTimeout(r, 500));
    const newSession = await getSession();
    const userRole = (newSession?.user as any)?.role;
    if (userRole === 'ADMIN') {
      setCurrentView('admin');
    } else if (userRole === 'RESTAURANT') {
      setCurrentView('dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    if (mode === 'login') {
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      try {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.ok) {
          toast.success('تم تسجيل الدخول');
          setAuthModalOpen(false);
          await handleRedirect();
        }
        else toast.error('بيانات غير صحيحة');
      } catch { toast.error('خطأ'); }
    } else {
      const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;
      const body: Record<string, string> = { name, email, password, role };
      if (role === 'RESTAURANT') {
        body.restaurantName = (form.elements.namedItem('restaurantName') as HTMLInputElement)?.value;
        body.whatsapp = (form.elements.namedItem('whatsapp') as HTMLInputElement)?.value;
        body.category = (form.querySelector('select[name="category"]') as HTMLSelectElement)?.value;
        body.city = (form.querySelector('select[name="city"]') as HTMLSelectElement)?.value;
      }
      try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
          toast.success('تم إنشاء الحساب');
          await signIn('credentials', { email, password, redirect: false });
          setAuthModalOpen(false);
          await handleRedirect();
        }
        else toast.error(data.error || 'خطأ');
      } catch { toast.error('خطأ'); }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-black">{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</DialogTitle>
          <DialogDescription className="text-center text-gray-500">{mode === 'login' ? 'أدخل بياناتك' : 'أنشئ حسابك وابدأ الاستكشاف'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {mode === 'register' && (<>
            <div><label className="block text-sm font-bold mb-1">الاسم</label><input name="name" required placeholder="أدخل اسمك" className="w-full border rounded-xl px-4 py-2.5 text-sm" /></div>
            <div><label className="block text-sm font-bold mb-1">نوع الحساب</label>
              <select name="role" className="w-full border rounded-xl px-4 py-2.5 text-sm" value={role} onChange={e => setRole(e.target.value)}>
                <option value="CUSTOMER">زبون</option><option value="RESTAURANT">مطعم</option>
              </select>
            </div>
            {role === 'RESTAURANT' && (
              <div className="space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700">بيانات المطعم</p>
                <input name="restaurantName" placeholder="اسم المطعم" className="w-full border rounded-xl px-4 py-2.5 text-sm" required />
                <input name="whatsapp" placeholder="+249XXXXXXXXX" className="w-full border rounded-xl px-4 py-2.5 text-sm" required />
                <select name="category" className="w-full border rounded-xl px-4 py-2.5 text-sm" required>{cuisineCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                <select name="city" className="w-full border rounded-xl px-4 py-2.5 text-sm" required>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
              </div>
            )}
          </>)}
          <div><label className="block text-sm font-bold mb-1">البريد</label><input name="email" type="email" required placeholder="example@email.com" className="w-full border rounded-xl px-4 py-2.5 text-sm" dir="ltr" /></div>
          <div><label className="block text-sm font-bold mb-1">كلمة المرور</label><input name="password" type="password" required placeholder="••••••••" className="w-full border rounded-xl px-4 py-2.5 text-sm" /></div>
          <button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-bold">{submitting ? 'جاري...' : (mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب')}</button>
          <p className="text-center text-sm text-gray-500">{mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب؟'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-red-600 font-bold mr-1">{mode === 'login' ? 'أنشئ حساباً' : 'سجل دخول'}</button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */

function Footer() {
  return (
    <footer className="bg-zinc-900 text-white pt-20 pb-10 px-6 md:px-10 border-t-4 border-red-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div><div className="flex items-center gap-2 mb-6"><span className="text-3xl font-black">FAST</span><span className="text-3xl text-red-600 italic" style={{ fontFamily: 'cursive' }}>food</span></div>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">منصة المطاعم السودانية الأولى - اكتشف، تابع، اطلب عبر واتساب</p>
          <div className="flex gap-4">
            <a href="#" className="bg-zinc-800 p-3 rounded-full hover:bg-red-600 transition"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg></a>
            <a href="#" className="bg-zinc-800 p-3 rounded-full hover:bg-red-600 transition"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>
          </div>
        </div>
        <div><h4 className="text-lg font-bold mb-6">روابط سريعة</h4><ul className="space-y-4 text-gray-400"><li><span className="hover:text-red-500 transition cursor-pointer">الرئيسية</span></li><li><span className="hover:text-red-500 transition cursor-pointer">استكشاف المطاعم</span></li><li><span className="hover:text-red-500 transition cursor-pointer">آخر الأخبار</span></li><li><span className="hover:text-red-500 transition cursor-pointer">من نحن</span></li></ul></div>
        <div><h4 className="text-lg font-bold mb-6">أوقات العمل</h4><ul className="space-y-4 text-gray-400"><li className="flex justify-between border-b border-zinc-800 pb-2"><span>الاثنين - الخميس</span><span className="text-amber-500">10am - 11pm</span></li><li className="flex justify-between border-b border-zinc-800 pb-2"><span>الجمعة - السبت</span><span className="text-amber-500">10am - 1am</span></li><li className="flex justify-between pb-2"><span>الأحد</span><span className="text-red-500">مغلق</span></li></ul></div>
        <div><h4 className="text-lg font-bold mb-6">النشرة البريدية</h4><p className="text-gray-400 text-sm mb-4">اشترك ليصلك أحدث العروض.</p><div className="flex"><input type="email" placeholder="البريد الإلكتروني" className="bg-zinc-800 text-white px-4 py-3 rounded-r-xl w-full focus:outline-none focus:ring-1 focus:ring-red-500" /><button className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-l-xl transition"><Send className="w-5 h-5" /></button></div></div>
      </div>
      <div className="border-t border-zinc-800 pt-8 text-center text-gray-500 text-sm">جميع الحقوق محفوظة © 2026 FASTfood - منصة المطاعم السودانية</div>
    </footer>
  );
}

/* ============================================================
   PLANS VIEW (Subscription Plans)
   ============================================================ */

function PlansView() {
  const { session } = useApp();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, settingsRes] = await Promise.all([
          fetch('/api/plans'),
          fetch('/api/platform-settings'),
        ]);
        const plansData = await plansRes.json();
        const settingsData = await settingsRes.json();
        setPlans(plansData.plans || []);
        setAdminWhatsapp(settingsData.settings?.admin_whatsapp || '+249123456000');
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const planColors = [
    { border: 'border-gray-200', bg: 'bg-white', headerBg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', btn: 'bg-gray-800 hover:bg-gray-900 text-white', popular: false },
    { border: 'border-blue-200', bg: 'bg-white', headerBg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700 text-white', popular: false },
    { border: 'border-amber-300', bg: 'bg-gradient-to-b from-amber-50/50 to-white', headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500', badge: 'bg-amber-100 text-amber-700', btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white', popular: true },
    { border: 'border-purple-200', bg: 'bg-white', headerBg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700 text-white', popular: false },
  ];

  function handleSelectPlan(plan: SubscriptionPlan) {
    const userInfo = session?.user?.email
      ? `\n\nبيانات الحساب:\nالاسم: ${session.user?.name || '-'}\nالبريد: ${session.user?.email}`
      : '';
    const message = encodeURIComponent(
      `مرحباً، أريد الاشتراك في خطة "${plan.name}" (${plan.nameEn})\nالسعر: ${plan.price.toLocaleString()} ${plan.currency}\nالمدة: ${plan.duration} يوم${userInfo}\n\nأرجو تأكيد الاشتراك وإرشادي للدفع.`
    );
    const url = `https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-28 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded-full w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-gray-100 rounded-full w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-3xl p-6 animate-pulse border border-gray-100"><div className="h-40 bg-gray-100 rounded-2xl mb-4" /></div>)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-600 font-bold mb-6">
            <Gift className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            خطط الاشتراك
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            اختر الخطة المناسبة <span className="text-amber-500">لمطعمك</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            انضم لمنصة FASTfood واعرض مطعمك أمام آلاف الزبائن. خطط مرنة تناسب جميع المطاعم.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan, idx) => {
            const colors = planColors[idx] || planColors[0];
            const featuresList = plan.features.split('|');
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-3xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col ${colors.popular ? 'lg:-mt-4 lg:mb-4 shadow-xl' : 'shadow-sm hover:shadow-lg'} transition-all duration-300`}
                data-aos="zoom-in"
                data-aos-delay={idx * 100}
              >
                {colors.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-4 py-1.5 rounded-full font-bold shadow-lg">
                    الأكثر طلباً
                  </div>
                )}
                <div className={`rounded-2xl p-4 mb-6 text-center ${colors.headerBg}`}>
                  <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.nameEn}</p>
                </div>
                <div className="text-center mb-6">
                  {plan.price === 0 ? (
                    <div className="text-4xl font-black text-green-600">مجاني</div>
                  ) : (
                    <>
                      <div className="text-4xl font-black text-gray-900">{plan.price.toLocaleString()}</div>
                      <div className="text-sm text-gray-500 mt-1">{plan.currency} / {plan.duration} يوم</div>
                    </>
                  )}
                </div>
                <div className="flex-1 mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">المميزات</p>
                  <ul className="space-y-2.5">
                    {featuresList.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.popular ? 'text-amber-500' : 'text-green-500'}`} />
                        <span>{feature.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${colors.btn} shadow-md hover:shadow-lg active:scale-95`}
                >
                  {plan.price === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
                </button>
                {plan.price > 0 && (
                  <p className="text-[10px] text-gray-400 text-center mt-2">سيتم تحويلك لواتساب لإتمام الاشتراك</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white mb-12" data-aos="fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10+', label: 'مطاعم مسجلة', icon: <Store className="w-6 h-6 mx-auto mb-2 text-amber-400" /> },
              { value: '4', label: 'خطط مرنة', icon: <Tag className="w-6 h-6 mx-auto mb-2 text-amber-400" /> },
              { value: '24/7', label: 'دعم متواصل', icon: <MessageCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" /> },
              { value: '100%', label: 'رضا العملاء', icon: <Award className="w-6 h-6 mx-auto mb-2 text-amber-400" /> },
            ].map((stat, i) => (
              <div key={i} data-aos="zoom-in" data-aos-delay={i * 80}>
                {stat.icon}
                <div className="text-2xl md:text-3xl font-black">{stat.value}</div>
                <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-12" data-aos="fade-up">
          <h2 className="text-2xl font-black text-center mb-8">الأسئلة الشائعة</h2>
          <div className="space-y-4">
            {[
              { q: 'كيف يمكنني الاشتراك؟', a: 'اختر الخطة المناسبة لك ثم اضغط على "اشترك الآن". سيتم تحويلك لواتساب لإتمام عملية الاشتراك والدفع.' },
              { q: 'هل يمكنني تغيير خطتي لاحقاً؟', a: 'نعم، يمكنك الترقية أو تغيير خطتك في أي وقت. تواصل معنا عبر واتساب وسنساعدك في الانتقال.' },
              { q: 'ما هي طرق الدفع المتاحة؟', a: 'نقبل الدفع عبر التحويل البنكي، مدى، فوري، والدفع النقدي عند الزيارة.' },
              { q: 'هل هناك فترة تجريبية؟', a: 'الخطة المجانية متاحة دائماً بدون وقت محدود. ويمكنك ترقية حسابك في أي وقت.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-red-100 text-red-600 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                  {faq.q}
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed mr-9">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    </motion.div>
  );
}

/* ============================================================
   HOME VIEW
   ============================================================ */

function HomeView() {
  const { setCurrentView, restaurants, loading, selectedCategory, setSelectedCategory, goToRestaurant, addToCart } = useApp();
  const [heroBg, setHeroBg] = useState(bgColors[0]);
  const filtered = selectedCategory ? restaurants.filter(r => r.category === selectedCategory) : restaurants;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <main className="relative bg-dynamic-gradient" style={{ background: heroBg }}>
        <SwiperHero onSlideChange={(i) => setHeroBg(bgColors[i] || bgColors[0])} />
      </main>

      {/* About Preview */}
      <section className="py-24 px-6 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 relative" data-aos="fade-left">
            <div className="absolute inset-0 bg-red-100 rounded-[3rem] transform -rotate-3 scale-105 -z-10" />
            <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="" className="w-full rounded-[3rem] shadow-2xl object-cover h-[400px]" />
            <div className="absolute -bottom-6 -right-6 bg-amber-400 p-6 rounded-3xl shadow-xl flex items-center gap-4 animate-bounce-slow">
              <span className="text-4xl font-black text-white">10+</span><span className="text-sm font-bold text-gray-900 leading-tight">سنوات من<br />الخبرة</span>
            </div>
          </div>
          <div className="order-1 md:order-2" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 font-bold mb-6"><span className="w-2 h-2 rounded-full bg-red-600" />منصة المطاعم السودانية</div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">اكتشف أفضل <br /><span className="text-red-600">المطاعم</span> في السودان</h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">تصفح قوائم الطعام، تابع مطاعمك المفضلة، أضف منشوراتك، واطلب عبر واتساب بسهولة وسرعة</p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3"><div className="bg-green-100 p-3 rounded-xl text-green-600"><Check className="w-5 h-5" /></div><div><h4 className="font-bold text-gray-900">مطاعم موثقة</h4><p className="text-sm text-gray-500">جميعها حقيقية ومتحقق منها</p></div></div>
              <div className="flex items-start gap-3"><div className="bg-amber-100 p-3 rounded-xl text-amber-600"><Clock className="w-5 h-5" /></div><div><h4 className="font-bold text-gray-900">طلب فوري</h4><p className="text-sm text-gray-500">عبر واتساب مباشرة</p></div></div>
            </div>
            <button onClick={() => setCurrentView('explore')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-red-500/30 transition transform hover:-translate-y-1">استكشف المطاعم</button>
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-24 px-6 md:px-10 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 font-bold mb-4" data-aos="fade-down"><span className="w-2 h-2 rounded-full bg-red-600" />مطاعم مميزة</div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900" data-aos="fade-up">اكتشف <span className="text-red-600">أشهر المطاعم</span></h2>
          <div className="flex flex-wrap justify-center gap-3 mt-10" data-aos="fade-up" data-aos-delay="100">
            <button onClick={() => setSelectedCategory('')} className={selectedCategory === '' ? 'bg-red-600 text-white px-5 py-2 rounded-full font-bold shadow-md text-sm' : 'bg-white hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-full font-bold shadow-sm border border-gray-200 text-sm transition'}>الكل</button>
            {cuisineCategories.slice(0, 6).map(c => (
              <button key={c.id} onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
                className={`flex items-center gap-1 px-4 py-2 rounded-full font-bold shadow-sm text-sm transition ${selectedCategory === c.id ? `${c.color} shadow-md` : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white rounded-3xl p-6 animate-pulse"><div className="h-40 bg-gray-200 rounded-2xl mb-4" /><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Store className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-400 text-lg">لا توجد مطاعم في هذا التصنيف</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {filtered.slice(0, 8).map((rest, idx) => (
              <div key={rest.id} onClick={() => goToRestaurant(rest.slug)} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group" data-aos="zoom-in" data-aos-delay={idx * 50}>
                <div className="h-40 bg-gradient-to-br from-red-50 to-amber-50 relative flex items-center justify-center">
                  {rest.isVerified && <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold"><Check className="w-3 h-3 inline ml-1" /> موثق</span>}
                  {rest.deliveryAvailable && <span className="absolute top-3 left-3 bg-white/90 text-gray-700 text-[10px] px-2 py-1 rounded-full font-bold"><MessageCircle className="w-3 h-3 inline ml-1" /> توصيل</span>}
                  <span className="text-5xl font-black text-red-200">{rest.restaurantName.charAt(0)}</span>
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-black text-gray-900 mb-1 group-hover:text-red-600 transition">{rest.restaurantName}</h4>
                  <p className="text-gray-400 text-xs flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{rest.city} {rest.area && `• ${rest.area}`}</p>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{rest.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1"><StarRating rating={rest.avgRating} /><span className="text-xs font-bold text-gray-700">{rest.avgRating}</span><span className="text-[10px] text-gray-400">({rest.ratingsCount})</span></div>
                    <div className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{rest.followersCount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-12" data-aos="fade-up">
          <button onClick={() => setCurrentView('explore')} className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold py-3 px-8 rounded-full transition">عرض جميع المطاعم</button>
        </div>
      </section>

      {/* Subscription Plans Preview */}
      <section className="py-24 px-6 md:px-10 bg-gradient-to-b from-white to-amber-50/50">
        <div className="max-w-7xl mx-auto text-center" data-aos="fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-600 font-bold mb-4">
            <Gift className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            خطط الاشتراك
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">انضم لمنصة <span className="text-amber-500">FASTfood</span></h2>
          <p className="text-gray-500 mb-10 max-w-2xl mx-auto">اعرض مطعمك أمام آلاف الزبائن بخطط مرنة تناسب حجم عملك</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: 'مجاني', price: '0', unit: 'مجاناً', color: 'border-gray-200', desc: 'للمطاعم الناشئة' },
              { name: 'أساسي', price: '5,000', unit: 'ج.س/شهر', color: 'border-blue-200', desc: 'للمطاعم المتوسطة' },
              { name: 'مميز', price: '15,000', unit: 'ج.س/شهر', color: 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200', desc: 'الأكثر طلباً ⭐' },
              { name: 'احترافي', price: '35,000', unit: 'ج.س/شهر', color: 'border-purple-200', desc: 'للمطاعم الكبيرة' },
            ].map((plan, i) => (
              <div key={i} className={`border-2 ${plan.color} rounded-2xl p-5 text-center hover:shadow-lg transition-all duration-300`} data-aos="zoom-in" data-aos-delay={i * 80}>
                <h4 className="font-black text-gray-900 text-lg">{plan.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                <div className="text-2xl font-black text-gray-900 mt-3">{plan.price}</div>
                <p className="text-xs text-gray-400">{plan.unit}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setCurrentView('plans')} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-amber-500/30 transition transform hover:-translate-y-1">
            عرض التفاصيل والاشتراك
          </button>
        </div>
      </section>
      <Footer />
    </motion.div>
  );
}

/* ============================================================
   EXPLORE VIEW
   ============================================================ */

function ExploreView() {
  const { restaurants, loading, selectedCategory, setSelectedCategory, selectedCity, setSelectedCity, searchQuery, setSearchQuery, goToRestaurant, toggleFollow, follows, session, setAuthModalOpen } = useApp();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10" data-aos="fade-down">
          <h1 className="text-3xl md:text-5xl font-black mb-4">استكشف <span className="text-red-600">المطاعم</span></h1>
          <p className="text-gray-500">ابحث واكتشف أفضل المطاعم في السودان</p>
        </div>
        <div className="max-w-2xl mx-auto mb-8" data-aos="fade-up">
          <div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input placeholder="ابحث عن مطعم، طبق، خدمة..." className="w-full pr-12 pl-4 py-4 rounded-2xl text-lg bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-4" data-aos="fade-up">
          <button onClick={() => setSelectedCategory('')} className={selectedCategory === '' ? 'bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold' : 'bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50'}>الكل</button>
          {cuisineCategories.map(c => (
            <button key={c.id} onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition ${selectedCategory === c.id ? `${c.color}` : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{c.icon} {c.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-10" data-aos="fade-up">
          <button onClick={() => setSelectedCity('')} className={selectedCity === '' ? 'bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold' : 'bg-white border text-gray-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50'}>كل المدن</button>
          {cities.map(c => <button key={c} onClick={() => setSelectedCity(selectedCity === c ? '' : c)} className={selectedCity === c ? 'bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold' : 'bg-white border text-gray-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50'}>{c}</button>)}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-3xl p-6 animate-pulse"><div className="h-40 bg-gray-200 rounded-2xl mb-4" /><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /></div>)}</div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20"><Search className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-400">لا توجد نتائج</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {restaurants.map((rest, idx) => (
              <div key={rest.id} onClick={() => goToRestaurant(rest.slug)} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group relative" data-aos="zoom-in" data-aos-delay={idx * 50}>
                <div className="h-44 bg-gradient-to-br from-red-50 to-amber-50 relative flex items-center justify-center">
                  {rest.isVerified && <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold"><Check className="w-3 h-3 inline ml-1" /> موثق</span>}
                  <span className="text-5xl font-black text-red-200">{rest.restaurantName.charAt(0)}</span>
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-black text-gray-900 mb-1">{rest.restaurantName}</h4>
                  <p className="text-gray-400 text-xs mb-2"><MapPin className="w-3 h-3 inline ml-1" />{rest.city} • {rest.category}</p>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{rest.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1"><StarRating rating={rest.avgRating} /><span className="text-xs font-bold">{rest.avgRating}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); toggleFollow(rest.id); }}
                      className={`text-xs px-3 py-1 rounded-full font-bold transition ${follows.has(rest.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-50'}`}>
                      {follows.has(rest.id) ? '✓ متابع' : '+ متابعة'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-16" /><Footer />
    </motion.div>
  );
}

/* ============================================================
   RESTAURANT PROFILE VIEW
   ============================================================ */

function RestaurantProfileView() {
  const { selectedRestaurant, toggleFollow, follows, toggleLike, likes, addToCart, session, setAuthModalOpen, setCurrentView } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (selectedRestaurant?.slug) {
      fetch(`/api/restaurants/${selectedRestaurant.slug}/reviews`).then(r => r.json()).then(d => setReviews(d.reviews || [])).catch(() => {});
    }
  }, [selectedRestaurant]);

  if (!selectedRestaurant) return <div className="pt-32 text-center"><p>لم يتم العثور على المطعم</p></div>;
  const r = selectedRestaurant;

  const sendWhatsApp = () => {
    const items = [{ name: 'طبق 1', qty: 1 }];
    const msg = items.map(i => `- ${i.name} ×${i.qty}`).join('\n');
    window.open(`https://wa.me/${r.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أريد طلب:\n${msg}`)}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-red-600 to-red-800 pt-28 pb-16 px-6 text-white">
        <div className="max-w-5xl mx-auto" data-aos="fade-up">
          <div className="flex items-center gap-3 mb-4">
            {r.isVerified && <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold"><Check className="w-3 h-3 inline ml-1" /> موثق</span>}
            <span className="bg-white/20 text-xs px-3 py-1 rounded-full">{r.category}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-3">{r.restaurantName}</h1>
          <p className="text-white/80 text-lg mb-6 max-w-2xl">{r.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{r.city} {r.area && `• ${r.area}`}</span>
            <span className="flex items-center gap-1"><StarRating rating={r.avgRating} size="md" /><span className="font-bold">{r.avgRating}</span> ({r.ratingsCount})</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{r.followersCount} متابع</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{r.openingHours}</span>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => toggleFollow(r.id)} className={`px-6 py-3 rounded-full font-bold transition ${follows.has(r.id) ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'}`}>
              {follows.has(r.id) ? '✓ متابع' : '+ متابعة'}
            </button>
            <button onClick={sendWhatsApp} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4" /> واتساب</button>
            {r.phone && <a href={`tel:${r.phone}`} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full font-bold flex items-center gap-2"><Phone className="w-4 h-4" /> {r.phone}</a>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-1 flex gap-1 overflow-x-auto">
          {[
            { id: 'menu', label: `القائمة (${r.menuItems?.length || r._count?.menuItems || 0})`, icon: <Utensils className="w-4 h-4" /> },
            { id: 'services', label: 'الخدمات', icon: <Gift className="w-4 h-4" /> },
            { id: 'posts', label: `المنشورات (${r.offerPosts?.length || 0})`, icon: <Tag className="w-4 h-4" /> },
            { id: 'reviews', label: `التقييمات (${reviews.length})`, icon: <Star className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(r.menuItems || []).filter(i => i.isAvailable).map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition border border-gray-100" data-aos="zoom-in">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-black text-gray-900">{item.name}</h4>
                  <div className="flex gap-1">{item.isPopular && <span className="bg-red-100 text-red-600 text-[9px] px-2 py-0.5 rounded-full font-bold">شائع</span>}{item.isSpicy && <span className="bg-orange-100 text-orange-600 text-[9px] px-2 py-0.5 rounded-full font-bold">حار</span>}</div>
                </div>
                {item.description && <p className="text-gray-400 text-sm mb-3">{item.description}</p>}
                <div className="flex items-center gap-2 mb-3"><StarRating rating={item.avgRating} /><span className="text-xs text-gray-500">{item.avgRating}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-black text-red-600">{item.price} {item.currency}</span>
                  <button onClick={() => addToCart(item, r)} className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-xl flex items-center justify-center transition"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(r.services || []).map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100" data-aos="fade-up">
                <h4 className="text-lg font-black text-gray-900 mb-2">{s.name}</h4>
                <p className="text-gray-500 text-sm mb-3">{s.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">{s.price ? `${s.price} ${s.currency}` : 'مجاناً'}</span>
                  <button onClick={() => toggleLike('SERVICE', s.id)} className={`flex items-center gap-1 text-sm ${likes.has(`SERVICE-${s.id}`) ? 'text-red-600' : 'text-gray-400'}`}><Heart className={`w-4 h-4 ${likes.has(`SERVICE-${s.id}`) ? 'fill-red-600' : ''}`} />{s.likesCount}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {(r.offerPosts || []).map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100" data-aos="fade-up">
                <div className="flex items-center gap-2 mb-3">
                  {postTypeLabels[p.type] && <span className={`${postTypeLabels[p.type].color} text-xs px-3 py-1 rounded-full font-bold`}>{postTypeLabels[p.type].label}</span>}
                  {p.discountPercentage && <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold">خصم {p.discountPercentage}%</span>}
                </div>
                <p className="text-gray-700 mb-4">{p.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <button onClick={() => toggleLike('POST', p.id)} className={`flex items-center gap-1 ${likes.has(`POST-${p.id}`) ? 'text-red-600' : 'hover:text-red-600'}`}><Heart className={`w-4 h-4 ${likes.has(`POST-${p.id}`) ? 'fill-red-600' : ''}`} />{p.likesCount}</button>
                  <span>{new Date(p.createdAt).toLocaleDateString('ar-SD')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {reviews.map(rv => (
              <div key={rv.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100" data-aos="fade-up">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700">{(rv.user?.name || 'م').charAt(0)}</div>
                  <div><p className="font-bold text-gray-900">{rv.user?.name || 'مستخدم'}</p><p className="text-xs text-gray-400">{new Date(rv.createdAt).toLocaleDateString('ar-SD')}</p></div>
                  <div className="mr-auto"><StarRating rating={rv.rating} /></div>
                </div>
                {rv.title && <h4 className="font-bold text-gray-800 mb-1">{rv.title}</h4>}
                <p className="text-gray-600">{rv.content}</p>
              </div>
            ))}
            {reviews.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد تقييمات بعد</p>}
          </div>
        )}
      </div>
      <div className="h-8" /><Footer />
    </motion.div>
  );
}

/* ============================================================
   FEED VIEW
   ============================================================ */

/* --- Feed types --- */
interface StoryItem { id: number; mediaUrl: string; content: string; storyType: string; bgColor?: string; expiresAt: string; }
interface StoryGroup { restaurant: { id: number; restaurantName: string; logo: string; city: string }; stories: StoryItem[]; }
interface PostMedia { id: number; mediaUrl: string; mediaType: string; sortOrder: number; }
interface PostComment { id: number; content: string; user: { name: string; image?: string }; createdAt: string; }
interface FeedPost {
  id: number; content: string; type: string; discountPercentage?: number;
  createdAt: string; likesCount: number;
  restaurant: { restaurantName: string; slug: string; logo?: string; city: string; category: string };
  media: PostMedia[]; comments: PostComment[];
  _count?: { comments: number; likes: number };
}
interface ReelItem {
  id: number; videoUrl: string; thumbnailUrl?: string; caption: string;
  viewsCount: number; likesCount: number; createdAt: string;
  restaurant: { restaurantName: string; logo?: string; city: string };
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  return `منذ ${Math.floor(seconds / 86400)} يوم`;
};

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stories skeleton */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-14 h-3 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Posts skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/5" />
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-52 bg-gray-200 rounded-xl mb-4" />
          <div className="flex gap-6 border-t border-gray-100 pt-3">
            <div className="h-5 bg-gray-200 rounded w-16" />
            <div className="h-5 bg-gray-200 rounded w-16" />
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedView() {
  const { session, setAuthModalOpen, toggleLike, likes, goToRestaurant } = useApp();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  // Story viewer state
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyGroupIdx, setStoryGroupIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Reel player state
  const [reelPlayerOpen, setReelPlayerOpen] = useState(false);
  const [activeReel, setActiveReel] = useState<ReelItem | null>(null);

  /* ---------- Fetch data ---------- */
  useEffect(() => {
    Promise.all([
      fetch('/api/posts').then(r => r.json()).then(d => Array.isArray(d) ? d : d.posts || []).catch(() => [] as FeedPost[]),
      fetch('/api/stories').then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => [] as StoryGroup[]),
      fetch('/api/reels').then(r => r.json()).then(d => Array.isArray(d) ? d : []).catch(() => [] as ReelItem[]),
    ]).then(([p, s, r]) => {
      setPosts(p as FeedPost[]);
      setStories(s as StoryGroup[]);
      setReels(r as ReelItem[]);
    }).finally(() => setLoading(false));
  }, []);

  /* ---------- Submit comment ---------- */
  const submitComment = async (postId: number) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    setSubmittingComment(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, comments: [...p.comments, newComment.comment || { id: Date.now(), content: text, user: { name: session?.user?.name || 'أنت' }, createdAt: new Date().toISOString() }], _count: { ...p._count, comments: (p._count?.comments || p.comments.length) + 1 } }
            : p
        ));
        setCommentText(prev => ({ ...prev, [postId]: '' }));
      } else if (res.status === 401) {
        setAuthModalOpen(true);
      }
    } catch { /* silent */ }
    setSubmittingComment(null);
  };

  /* ---------- Story viewer ---------- */
  const openStoryViewer = (gIdx: number, sIdx = 0) => {
    setStoryGroupIdx(gIdx);
    setStoryIdx(sIdx);
    setStoryViewerOpen(true);
  };
  const advanceStory = useCallback((dir: 1 | -1) => {
    setStoryViewerOpen(false);
  }, []);
  const nextStory = useCallback(() => {
    const group = stories[storyGroupIdx];
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(prev => prev + 1);
    } else if (storyGroupIdx < stories.length - 1) {
      setStoryGroupIdx(prev => prev + 1);
      setStoryIdx(0);
    } else {
      setStoryViewerOpen(false);
    }
  }, [stories, storyGroupIdx, storyIdx]);
  const prevStory = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(prev => prev - 1);
    } else if (storyGroupIdx > 0) {
      const prevGroupLen = stories[storyGroupIdx - 1].stories.length;
      setStoryGroupIdx(prev => prev - 1);
      setStoryIdx(prevGroupLen - 1);
    }
  }, [stories, storyGroupIdx, storyIdx]);

  // Auto-advance story
  useEffect(() => {
    if (!storyViewerOpen) return;
    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    storyTimerRef.current = setTimeout(() => {
      nextStory();
    }, 5000);
    return () => { if (storyTimerRef.current) clearTimeout(storyTimerRef.current); };
  }, [storyViewerOpen, storyGroupIdx, storyIdx, nextStory]);

  const currentStoryGroup = stories[storyGroupIdx];
  const currentStory = currentStoryGroup?.stories[storyIdx];

  /* ---------- Lightbox ---------- */
  const openLightbox = (images: string[], idx = 0) => {
    setLightboxImages(images);
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  /* ---------- Media grid ---------- */
  const renderMediaGallery = (media: PostMedia[]) => {
    if (!media || media.length === 0) return null;
    const images = media.filter(m => m.mediaType === 'IMAGE').sort((a, b) => a.sortOrder - b.sortOrder);
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div className="rounded-xl overflow-hidden cursor-pointer" onClick={() => openLightbox(images.map(m => m.mediaUrl))}>
          <img src={images[0].mediaUrl} alt="" className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-300" />
        </div>
      );
    }
    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden cursor-pointer" onClick={() => openLightbox(images.map(m => m.mediaUrl))}>
          {images.map(img => (
            <img key={img.id} src={img.mediaUrl} alt="" className="w-full h-48 md:h-64 object-cover hover:opacity-95 transition-opacity" />
          ))}
        </div>
      );
    }
    // 3+ images
    return (
      <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
        {images.slice(0, 5).map((img, i) => (
          <div
            key={img.id}
            className={`relative cursor-pointer overflow-hidden ${images.length > 3 && i === 2 ? 'col-span-1' : ''} ${images.length === 4 ? (i < 2 ? 'col-span-1 row-span-1' : 'col-span-1 row-span-1') : ''}`}
            onClick={() => openLightbox(images.map(m => m.mediaUrl), i)}
          >
            <img
              src={img.mediaUrl}
              alt=""
              className={`w-full object-cover hover:opacity-95 transition-opacity ${
                images.length === 3 ? 'h-48 md:h-56' :
                images.length === 4 ? 'h-40 md:h-48' :
                i === 0 ? 'h-48 md:h-64' : 'h-32 md:h-40'
              }`}
            />
            {i === 2 && images.length > 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-black">+{images.length - 3}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /* ---------- RENDER ---------- */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-center mb-8" data-aos="fade-down">
          آخر <span className="text-red-600">الأخبار</span>
        </h1>

        {loading ? (
          <FeedSkeleton />
        ) : (
          <div className="space-y-6">

            {/* ============ STORIES BAR ============ */}
            {stories.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" data-aos="fade-down">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1" dir="rtl">
                  {stories.map((group, gIdx) => {
                    const firstStory = group.stories[0];
                    const hasExpired = firstStory && new Date(firstStory.expiresAt) < new Date();
                    if (hasExpired) return null;
                    return (
                      <button
                        key={group.restaurant.id}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                        onClick={() => openStoryViewer(gIdx)}
                      >
                        <div className="relative w-[68px] h-[68px] rounded-full p-[3px]"
                          style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                        >
                          <div className="w-full h-full rounded-full bg-white p-[2px]">
                            {group.restaurant.logo ? (
                              <img src={group.restaurant.logo} alt={group.restaurant.restaurantName}
                                className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-lg font-bold text-red-700">{group.restaurant.restaurantName.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-600 font-medium max-w-[72px] truncate group-hover:text-red-600 transition-colors">
                          {group.restaurant.restaurantName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============ POSTS FEED ============ */}
            {posts.length === 0 ? (
              <p className="text-center text-gray-400 py-16">لا توجد منشورات بعد</p>
            ) : (
              posts.map(p => {
                const isLiked = likes.has(`POST-${p.id}`);
                const totalComments = p._count?.comments ?? p.comments?.length ?? 0;
                return (
                  <motion.div
                    key={p.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    data-aos="fade-up"
                  >
                    {/* --- Post header --- */}
                    <div className="flex items-center gap-3 p-4 pb-3">
                      {p.restaurant?.logo ? (
                        <img src={p.restaurant.logo} alt={p.restaurant.restaurantName}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center ring-2 ring-gray-100">
                          <span className="font-bold text-red-700 text-lg">{(p.restaurant?.restaurantName || 'م').charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => goToRestaurant(p.restaurant.slug)}
                          className="font-bold text-gray-900 hover:text-red-600 transition-colors text-sm md:text-base"
                        >
                          {p.restaurant?.restaurantName}
                        </button>
                        <p className="text-xs text-gray-400">
                          {p.restaurant?.city}
                          {p.restaurant?.category && ` • ${p.restaurant.category}`}
                          {' • '}
                          {timeAgo(p.createdAt)}
                        </p>
                      </div>
                      {postTypeLabels[p.type] && (
                        <span className={`flex-shrink-0 ${postTypeLabels[p.type].color} text-xs px-3 py-1 rounded-full font-bold`}>
                          {postTypeLabels[p.type].label}
                        </span>
                      )}
                    </div>

                    {/* --- Content --- */}
                    <div className="px-4 pb-3">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">{p.content}</p>
                    </div>

                    {/* --- Discount badge --- */}
                    {p.discountPercentage && (
                      <div className="px-4 pb-3">
                        <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm">
                          <Tag className="w-4 h-4" />
                          خصم {p.discountPercentage}%
                        </div>
                      </div>
                    )}

                    {/* --- Media gallery --- */}
                    {p.media && p.media.length > 0 && (
                      <div className="px-4 pb-3">
                        {renderMediaGallery(p.media)}
                      </div>
                    )}

                    {/* --- Action bar --- */}
                    <div className="px-4 py-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          <span>{p.likesCount || 0}</span>
                        </div>
                        {totalComments > 0 && (
                          <span>{totalComments} تعليق</span>
                        )}
                      </div>
                      <div className="flex items-center border-t border-gray-100 pt-2">
                        <button
                          onClick={() => toggleLike('POST', p.id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors text-sm font-medium ${
                            isLiked
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-600' : ''}`} />
                          <span>{isLiked ? 'إعجاب' : 'أعجبني'}</span>
                        </button>
                        <button
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors text-sm font-medium"
                          onClick={() => {
                            const input = document.getElementById(`comment-input-${p.id}`);
                            input?.focus();
                          }}
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>تعليق</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors text-sm font-medium">
                          <Share2 className="w-5 h-5" />
                          <span>مشاركة</span>
                        </button>
                      </div>
                    </div>

                    {/* --- Comments section --- */}
                    {p.comments && p.comments.length > 0 && (
                      <div className="px-4 pb-3 border-t border-gray-50">
                        {expandedComments.has(p.id) ? (
                          <div className="space-y-2.5 py-3">
                            {p.comments.map(c => (
                              <div key={c.id} className="flex gap-2.5">
                                {c.user?.image ? (
                                  <img src={c.user.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-gray-500">{(c.user?.name || 'م').charAt(0)}</span>
                                  </div>
                                )}
                                <div className="bg-gray-100 rounded-2xl px-3 py-2 flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-800">{c.user?.name}</span>
                                  <p className="text-sm text-gray-700 mt-0.5 break-words">{c.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2.5 py-3">
                            {p.comments.slice(0, 2).map(c => (
                              <div key={c.id} className="flex gap-2.5">
                                {c.user?.image ? (
                                  <img src={c.user.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-gray-500">{(c.user?.name || 'م').charAt(0)}</span>
                                  </div>
                                )}
                                <div className="bg-gray-100 rounded-2xl px-3 py-2 flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-800">{c.user?.name}</span>
                                  <p className="text-sm text-gray-700 mt-0.5 break-words">{c.content}</p>
                                </div>
                              </div>
                            ))}
                            {totalComments > 2 && (
                              <button
                                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                onClick={() => setExpandedComments(prev => new Set(prev).add(p.id))}
                              >
                                عرض جميع التعليقات ({totalComments})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Comment input --- */}
                    {session && (
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                        <div className="flex items-center gap-2.5">
                          {session.user?.image ? (
                            <img src={session.user.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-red-700">{(session.user?.name || 'م').charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2">
                            <input
                              id={`comment-input-${p.id}`}
                              type="text"
                              placeholder="اكتب تعليقاً..."
                              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                              value={commentText[p.id] || ''}
                              onChange={e => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') submitComment(p.id); }}
                            />
                            <button
                              onClick={() => submitComment(p.id)}
                              disabled={submittingComment === p.id || !(commentText[p.id] || '').trim()}
                              className="mr-2 text-red-600 hover:text-red-700 disabled:text-gray-300 transition-colors"
                            >
                              {submittingComment === p.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Send className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {!session && (
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                        <button
                          onClick={() => setAuthModalOpen(true)}
                          className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                        >
                          سجّل دخولك لإضافة تعليق
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* ============ REELS SECTION ============ */}
            {reels.length > 0 && (
              <div className="mt-8" data-aos="fade-up">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Film className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-black text-gray-900">الريلز</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" dir="rtl">
                  {reels.map(reel => (
                    <button
                      key={reel.id}
                      className="flex-shrink-0 w-48 md:w-56 group"
                      onClick={() => { setActiveReel(reel); setReelPlayerOpen(true); }}
                    >
                      <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-gray-900">
                        {reel.thumbnailUrl ? (
                          <img src={reel.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <Video className="w-10 h-10 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-7 h-7 text-gray-900 fill-gray-900 mr-[-2px]" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <p className="text-white text-xs font-bold truncate">{reel.caption}</p>
                          <div className="flex items-center gap-3 mt-1 text-white/80 text-[11px]">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {reel.viewsCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" /> {reel.likesCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 px-1">
                        {reel.restaurant?.logo ? (
                          <img src={reel.restaurant.logo} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-red-700">{(reel.restaurant?.restaurantName || 'م').charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-xs text-gray-600 font-medium truncate">{reel.restaurant?.restaurantName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============ STORY VIEWER OVERLAY ============ */}
      <AnimatePresence>
        {storyViewerOpen && currentStoryGroup && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setStoryViewerOpen(false)}
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3" dir="rtl">
              {currentStoryGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-[5000ms] ease-linear"
                    style={{
                      width: i < storyIdx ? '100%' : i === storyIdx ? '100%' : '0%',
                      transition: i === storyIdx ? 'width 5s linear' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Restaurant header */}
            <div className="absolute top-8 left-0 right-0 z-10 flex items-center gap-3 px-4" dir="rtl">
              {currentStoryGroup.restaurant.logo ? (
                <img src={currentStoryGroup.restaurant.logo} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/50" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{currentStoryGroup.restaurant.restaurantName.charAt(0)}</span>
                </div>
              )}
              <span className="text-white font-bold text-sm">{currentStoryGroup.restaurant.restaurantName}</span>
              <span className="text-white/60 text-xs">{timeAgo(currentStory.expiresAt)}</span>
            </div>

            {/* Story content */}
            <div className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {/* Navigation zones */}
              <div className="absolute inset-0 flex z-10">
                <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full cursor-pointer" onClick={nextStory} />
              </div>

              {currentStory.mediaUrl ? (
                <img src={currentStory.mediaUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: currentStory.bgColor || '#1a1a2e' }}
                >
                  <p className="text-white text-2xl font-black text-center px-8 leading-relaxed">
                    {currentStory.content}
                  </p>
                </div>
              )}
              {currentStory.content && currentStory.mediaUrl && (
                <div className="absolute bottom-20 left-0 right-0 text-center px-6">
                  <p className="text-white text-base font-bold drop-shadow-lg bg-black/30 rounded-2xl py-3 px-5 inline-block max-w-sm">
                    {currentStory.content}
                  </p>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => setStoryViewerOpen(false)}
              className="absolute top-8 left-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ IMAGE LIGHTBOX ============ */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {lightboxImages.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIdx(prev => prev > 0 ? prev - 1 : lightboxImages.length - 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIdx(prev => prev < lightboxImages.length - 1 ? prev + 1 : 0); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            <img
              src={lightboxImages[lightboxIdx]}
              alt=""
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />

            {lightboxImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                {lightboxIdx + 1} / {lightboxImages.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ REEL PLAYER OVERLAY ============ */}
      <AnimatePresence>
        {reelPlayerOpen && activeReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setReelPlayerOpen(false)}
          >
            <button
              onClick={() => setReelPlayerOpen(false)}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <video
                src={activeReel.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full max-h-screen object-contain"
              />
            </div>

            {/* Reel info overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                {activeReel.restaurant?.logo ? (
                  <img src={activeReel.restaurant.logo} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{(activeReel.restaurant?.restaurantName || 'م').charAt(0)}</span>
                  </div>
                )}
                <span className="text-white text-sm font-bold">{activeReel.restaurant?.restaurantName}</span>
              </div>
              <p className="text-white/90 text-sm max-w-sm mx-auto">{activeReel.caption}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-8" /><Footer />
    </motion.div>
  );
}

/* ============================================================
   MENU VIEW (Static FASTfood)
   ============================================================ */

function MenuView() {
  const { addToCartStatic, cartCount, setCurrentView } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const filteredItems = selectedCategory === 'الكل' ? foodItems : foodItems.filter(f => f.category === selectedCategory);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pt-32 pb-10 px-6">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black mb-4" data-aos="fade-down">قائمة <span className="text-red-600">الطعام</span></h1>
          <p className="text-gray-500 text-lg" data-aos="fade-up">اختر وجبتك المفضلة من تشكيلتنا الواسعة</p>
        </div>
        <div className="max-w-4xl mx-auto flex gap-4 overflow-x-auto no-scrollbar pb-4 px-2" data-aos="fade-up">
          {categories.map(cat => (
            <div key={cat} onClick={() => setSelectedCategory(cat)} className={`category-pill bg-white px-8 py-3 rounded-2xl font-bold shadow-sm whitespace-nowrap ${selectedCategory === cat ? 'active' : 'text-gray-500 hover:bg-gray-50'}`}>
              {cat === 'الكل' ? '🔥 ' : ''}{cat}
            </div>
          ))}
        </div>
      </div>
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="food-card bg-white p-6 relative group" data-aos="fade-up" data-aos-delay={idx * 100}>
              {item.badge && <div className="absolute top-6 left-6 z-10"><span className={`${item.badgeColor} text-[10px] font-black px-3 py-1 rounded-full`}>{item.badge}</span></div>}
              <div className="h-48 mb-6 flex items-center justify-center"><img src={item.image} alt={item.name} className="max-h-full object-contain" /></div>
              <div className="text-right">
                <h3 className="text-xl font-black text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-gray-900">${item.price.toFixed(2)}</span>
                  <button onClick={() => addToCartStatic(item)} className="add-to-cart bg-zinc-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-red-600 shadow-lg"><Plus className="w-6 h-6" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </motion.div>
  );
}

/* ============================================================
   CART VIEW
   ============================================================ */

function CartView() {
  const { cart, setCart, setCurrentView } = useApp();
  const [couponApplied, setCouponApplied] = useState(false);

  const increment = (id: number) => setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: c.quantity + 1 } : c));
  const decrement = (id: number) => {
    const item = cart.find(c => c.id === id);
    if (item && item.quantity > 1) setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c));
    else if (item && item.quantity === 1) setCart(prev => prev.filter(c => c.id !== id));
  };
  const remove = (id: number) => setCart(prev => prev.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = 2.50;
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const total = subtotal + delivery - discount;

  const sendWhatsApp = () => {
    if (cart.length === 0) return;
    const byRestaurant: Record<string, CartItem[]> = {};
    cart.forEach(i => { if (!byRestaurant[i.restaurantName]) byRestaurant[i.restaurantName] = []; byRestaurant[i.restaurantName].push(i); });
    const firstItem = cart[0];
    const msg = Object.entries(byRestaurant).map(([name, items]) =>
      `📦 ${name}:\n${items.map(i => `- ${i.name} ×${i.quantity} = ${i.price * i.quantity}`).join('\n')}`
    ).join('\n\n') + `\n\n💰 الإجمالي: $${total.toFixed(2)}`;
    window.open(`https://wa.me/${firstItem.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pt-28 px-6 pb-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div data-aos="fade-right"><h1 className="text-3xl md:text-5xl font-black">سلة <span className="text-red-600">الطلبات</span></h1><p className="text-gray-500 mt-2">راجع طلباتك وأتمم الشراء عبر واتساب</p></div>
          <button onClick={() => setCurrentView('menu')} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-5 py-3 rounded-full transition" data-aos="fade-left"><ChevronRight className="w-5 h-5" /><span className="font-bold">متابعة التسوق</span></button>
        </div>
      </div>
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" data-aos="fade-up">
              {cart.length === 0 ? (
                <div className="text-center py-16"><ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold mb-2">سلتك فارغة</h3><p className="text-gray-500 mb-4">أضف وجبات لذيذة من القائمة</p><button onClick={() => setCurrentView('menu')} className="bg-red-600 text-white px-6 py-3 rounded-full font-bold">استعرض القائمة</button></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-4 text-sm font-bold text-gray-600">المنتج</th><th className="px-6 py-4 text-sm font-bold text-gray-600">السعر</th><th className="px-6 py-4 text-sm font-bold text-gray-600">الكمية</th><th className="px-6 py-4 text-sm font-bold text-gray-600">الإجمالي</th><th className="px-6 py-4" /></tr></thead>
                    <tbody>{cart.map(item => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-red-50/30 transition">
                        <td className="px-6 py-5"><div className="flex items-center gap-3"><div><h4 className="font-bold text-sm">{item.name}</h4><p className="text-[10px] text-gray-400">{item.restaurantName}</p></div></div></td>
                        <td className="px-6 py-5 font-bold text-sm">${item.price.toFixed(2)}</td>
                        <td className="px-6 py-5"><div className="flex items-center gap-2"><button onClick={() => decrement(item.id)} className="qty-btn bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition">-</button><span className="font-bold w-8 text-center text-sm">{item.quantity}</span><button onClick={() => increment(item.id)} className="qty-btn bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition">+</button></div></td>
                        <td className="px-6 py-5 font-black text-sm">${(item.price * item.quantity).toFixed(2)}</td>
                        <td className="px-6 py-5"><button onClick={() => remove(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100" data-aos="fade-up">
              <div className="flex flex-wrap gap-4 items-end justify-between">
                <div className="flex-1 min-w-[200px]"><label className="block text-sm font-bold text-gray-700 mb-2">رمز الخصم</label><div className="flex gap-2"><input placeholder="أدخل الكود" className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" /><button onClick={() => { if (cart.length > 0) { setCouponApplied(true); toast.success('تم تطبيق خصم 10%'); } else toast.error('السلة فارغة'); }} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition">تطبيق</button></div></div>
                <div className="text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-xl">استخدم <span className="font-mono font-bold text-red-600">FAST10</span> لخصم 10%</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1" data-aos="fade-left">
            <div className="bg-white rounded-3xl shadow-lg p-6 sticky top-32 border border-gray-100">
              <h3 className="text-xl font-black border-b border-gray-200 pb-4 mb-5">ملخص الطلب</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 text-sm"><span>المجموع الفرعي</span><span className="font-bold">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600 text-sm"><span>رسوم التوصيل</span><span>${delivery.toFixed(2)}</span></div>
                {couponApplied && <div className="flex justify-between text-green-600 text-sm"><span>الخصم</span><span className="font-bold">- ${discount.toFixed(2)}</span></div>}
                <div className="border-t border-dashed border-gray-200 pt-3"><div className="flex justify-between text-lg font-black"><span>الإجمالي</span><span>${total.toFixed(2)}</span></div></div>
              </div>
              <button onClick={sendWhatsApp} disabled={cart.length === 0} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2">
                <MessageCircle className="w-5 h-5" /> اطلب عبر واتساب
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">سيتم تحويلك للواتساب لإتمام الطلب</p>
            </div>
          </div>
        </div>
      </section>
      <div className="h-16" /><Footer />
    </motion.div>
  );
}

/* ============================================================
   ABOUT VIEW (Static)
   ============================================================ */

function AboutView() {
  const stats = [{ value: '10+', label: 'سنوات من التميز', color: 'text-red-600' }, { value: '150K+', label: 'عميل سعيد', color: 'text-amber-500' }, { value: '45+', label: 'صنف متنوع', color: 'text-red-600' }, { value: '30min', label: 'توصيل سريع', color: 'text-amber-500' }];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="relative overflow-hidden pb-12 md:pb-20 px-6 pt-28 md:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-amber-50/20 to-white -z-10" />
        <div className="max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold mb-6" data-aos="fade-up"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />قصة شغف وتميز</span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight" data-aos="fade-up" data-aos-delay="100"><span className="outline-text-sm">نحن أكثر من مجرد</span><br /><span className="text-red-600">منصة مطاعم</span></h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto mt-6" data-aos="fade-up" data-aos-delay="200">منصة رقمية متعددة المستأجرين تجمع المطاعم السودانية في مكان واحد. تصفح، تابع، أضف تقييمات، واطلب عبر واتساب.</p>
        </div>
      </section>
      <section className="py-12 px-6 bg-gradient-to-l from-red-50 to-white border-y border-red-100/50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => <div key={i} data-aos="zoom-in" data-aos-delay={i * 100}><div className={`text-4xl md:text-5xl font-black ${s.color}`}>{s.value}</div><p className="text-gray-600 font-bold mt-2">{s.label}</p></div>)}
        </div>
      </section>
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative" data-aos="fade-left">
            <div className="absolute inset-0 bg-red-100 rounded-[3rem] transform -rotate-3 scale-105 -z-10" />
            <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="" className="w-full rounded-[3rem] shadow-2xl object-cover h-96" />
          </div>
          <div className="order-1 md:order-2" data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-black mb-6">منصة <span className="text-red-600">مطاعم السودان</span> الأولى</h2>
            <p className="text-gray-600 text-lg mb-6">نوفر للمطاعم منصة احترافية لعرض قوائمها الطعام، ونوفر للزبائن تجربة سهلة للبحث والمقارنة والطلب عبر واتساب مباشرة.</p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2"><div className="bg-green-100 p-2 rounded-full text-green-600"><Check className="w-5 h-5" /></div><span className="font-bold">مطاعم موثقة</span></div>
              <div className="flex items-center gap-2"><div className="bg-amber-100 p-2 rounded-full text-amber-600"><Clock className="w-5 h-5" /></div><span className="font-bold">طلب فوري</span></div>
              <div className="flex items-center gap-2"><div className="bg-red-100 p-2 rounded-full text-red-600"><Heart className="w-5 h-5" /></div><span className="font-bold">تفاعل اجتماعي</span></div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </motion.div>
  );
}

/* ============================================================
   DASHBOARD VIEW (Restaurant Owner)
   ============================================================ */

function DashboardView() {
  const { session } = useApp();

  /* ── state ── */
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // profile form
  const [pf, setPf] = useState({
    restaurantName: '', description: '', whatsapp: '', phone: '', address: '',
    city: '', area: '', category: '', cuisineType: '', openingHours: '',
    logo: '', coverImage: '', website: '', deliveryAvailable: false, minOrderAmount: 0,
  });

  // post dialog
  const [postOpen, setPostOpen] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [postForm, setPostForm] = useState({ content: '', type: 'OFFER', discountPercentage: '', startDate: '', endDate: '' });
  const [postMedia, setPostMedia] = useState<{ url: string; type: string }[]>([]);
  const [postMediaFiles, setPostMediaFiles] = useState<File[]>([]);

  // reel dialog
  const [reelOpen, setReelOpen] = useState(false);
  const [reelForm, setReelForm] = useState({ videoUrl: '', thumbnailUrl: '', caption: '' });
  const [reelVideoFile, setReelVideoFile] = useState<File | null>(null);
  const [reelThumbFile, setReelThumbFile] = useState<File | null>(null);

  // story dialog
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyForm, setStoryForm] = useState({ mediaUrl: '', content: '', storyType: 'IMAGE', bgColor: '#EF4444' });
  const [storyFile, setStoryFile] = useState<File | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  /* ── upload helper ── */
  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      return data.url || null;
    } catch { toast.error('فشل رفع الملف'); return null; }
    finally { setUploading(false); }
  };

  /* ── data fetching ── */
  const fetchAll = useCallback(async () => {
    if (!session) return;
    try {
      const [pRes, poRes, rRes, sRes] = await Promise.all([
        fetch('/api/restaurant/profile'),
        fetch('/api/restaurant/posts'),
        fetch('/api/restaurant/reels'),
        fetch('/api/restaurant/stories'),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.id) {
          setProfile(pData);
          setPf({
            restaurantName: pData.restaurantName || '',
            description: pData.description || '',
            whatsapp: pData.whatsapp || '',
            phone: pData.phone || '',
            address: pData.address || '',
            city: pData.city || '',
            area: pData.area || '',
            category: pData.category || '',
            cuisineType: pData.cuisineType || '',
            openingHours: pData.openingHours || '',
            logo: pData.logo || '',
            coverImage: pData.coverImage || '',
            website: pData.website || '',
            deliveryAvailable: !!pData.deliveryAvailable,
            minOrderAmount: pData.minOrderAmount || 0,
          });
        }
      } else {
        console.error('Profile fetch failed:', pRes.status);
      }
      if (poRes.ok) {
        const poData = await poRes.json();
        setPosts(Array.isArray(poData) ? poData : poData.posts || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setReels(Array.isArray(rData) ? rData : rData.reels || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setStories(Array.isArray(sData) ? sData : sData.stories || []);
      }
    } catch (err) {
      console.error('fetchAll error:', err);
    }
  }, [session]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── profile save ── */
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/restaurant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pf),
      });
      if (res.ok) { toast.success('تم تحديث البروفايل'); fetchAll(); }
      else toast.error('فشل التحديث');
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  /* ── logo / cover upload ── */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file);
    if (url) { setPf(p => ({ ...p, logo: url })); toast.success('تم رفع الشعار'); }
  };
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file);
    if (url) { setPf(p => ({ ...p, coverImage: url })); toast.success('تم رفع صورة الغلاف'); }
  };

  /* ── post CRUD ── */
  const openCreatePost = () => {
    setEditPostId(null);
    setPostForm({ content: '', type: 'OFFER', discountPercentage: '', startDate: '', endDate: '' });
    setPostMedia([]); setPostMediaFiles([]);
    setPostOpen(true);
  };
  const openEditPost = (p: any) => {
    setEditPostId(p.id);
    setPostForm({
      content: p.content || '', type: p.type || 'OFFER',
      discountPercentage: p.discountPercentage ? String(p.discountPercentage) : '',
      startDate: p.startDate ? p.startDate.split('T')[0] : '',
      endDate: p.endDate ? p.endDate.split('T')[0] : '',
    });
    setPostMedia(p.media || []);
    setPostMediaFiles([]);
    setPostOpen(true);
  };
  const handlePostMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPostMediaFiles(prev => [...prev, ...files]);
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) setPostMedia(prev => [...prev, { url, type: file.type.startsWith('video') ? 'video' : 'image' }]);
    }
  };
  const removePostMedia = (idx: number) => {
    setPostMedia(prev => prev.filter((_, i) => i !== idx));
    setPostMediaFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const savePost = async () => {
    if (!postForm.content.trim()) { toast.error('اكتب محتوى المنشور'); return; }
    setSaving(true);
    const body: any = {
      content: postForm.content,
      type: postForm.type,
      ...(postForm.discountPercentage ? { discountPercentage: Number(postForm.discountPercentage) } : {}),
      ...(postForm.startDate ? { startDate: postForm.startDate } : {}),
      ...(postForm.endDate ? { endDate: postForm.endDate } : {}),
      ...(postMedia.length ? { media: postMedia } : {}),
    };
    try {
      const url = editPostId ? `/api/restaurant/posts/${editPostId}` : '/api/restaurant/posts';
      const res = await fetch(url, { method: editPostId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success(editPostId ? 'تم تحديث المنشور' : 'تم إنشاء المنشور'); setPostOpen(false); fetchAll(); }
      else toast.error('فشل الحفظ');
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };
  const deletePost = async (id: number) => {
    try {
      const res = await fetch(`/api/restaurant/posts/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('تم حذف المنشور'); setDeleteTarget(null); fetchAll(); }
      else toast.error('فشل الحذف');
    } catch { toast.error('حدث خطأ'); }
  };

  /* ── reel CRUD ── */
  const openCreateReel = () => {
    setReelForm({ videoUrl: '', thumbnailUrl: '', caption: '' });
    setReelVideoFile(null); setReelThumbFile(null);
    setReelOpen(true);
  };
  const saveReel = async () => {
    if (!reelForm.videoUrl) { toast.error('ارفع فيديو أولاً'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/restaurant/reels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: reelForm.videoUrl, thumbnailUrl: reelForm.thumbnailUrl || undefined, caption: reelForm.caption || undefined }),
      });
      if (res.ok) { toast.success('تم إضافة الريلز'); setReelOpen(false); fetchAll(); }
      else toast.error('فشل الحفظ');
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };
  const handleReelVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file);
    if (url) { setReelForm(p => ({ ...p, videoUrl: url })); toast.success('تم رفع الفيديو'); }
  };
  const handleReelThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file);
    if (url) { setReelForm(p => ({ ...p, thumbnailUrl: url })); toast.success('تم رفع الصورة المصغرة'); }
  };
  const deleteReel = async (id: number) => {
    try {
      const res = await fetch(`/api/restaurant/reels/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('تم حذف الريلز'); setDeleteTarget(null); fetchAll(); }
      else toast.error('فشل الحذف');
    } catch { toast.error('حدث خطأ'); }
  };

  /* ── story CRUD ── */
  const openCreateStory = () => {
    setStoryForm({ mediaUrl: '', content: '', storyType: 'IMAGE', bgColor: '#EF4444' });
    setStoryFile(null);
    setStoryOpen(true);
  };
  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadFile(file);
    if (url) { setStoryForm(p => ({ ...p, mediaUrl: url })); toast.success('تم رفع الصورة'); }
  };
  const saveStory = async () => {
    if (storyForm.storyType === 'IMAGE' && !storyForm.mediaUrl) { toast.error('ارفع صورة أولاً'); return; }
    if (storyForm.storyType === 'TEXT' && !storyForm.content.trim()) { toast.error('اكتب محتوى الحالة'); return; }
    setSaving(true);
    try {
      const body: any = {
        storyType: storyForm.storyType,
        ...(storyForm.storyType === 'IMAGE' ? { mediaUrl: storyForm.mediaUrl } : {}),
        ...(storyForm.storyType === 'TEXT' ? { content: storyForm.content, bgColor: storyForm.bgColor } : {}),
      };
      const res = await fetch('/api/restaurant/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { toast.success('تم إضافة الحالة'); setStoryOpen(false); fetchAll(); }
      else toast.error('فشل الحفظ');
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };
  const deleteStory = async (id: number) => {
    try {
      const res = await fetch(`/api/restaurant/stories/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('تم حذف الحالة'); setDeleteTarget(null); fetchAll(); }
      else toast.error('فشل الحذف');
    } catch { toast.error('حدث خطأ'); }
  };

  /* ── tabs config ── */
  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'profile', label: 'البروفايل', icon: <Store className="w-4 h-4" /> },
    { id: 'posts', label: `المنشورات (${posts.length})`, icon: <Tag className="w-4 h-4" /> },
    { id: 'reels', label: `الريلز (${reels.length})`, icon: <Film className="w-4 h-4" /> },
    { id: 'stories', label: `الحالات (${stories.length})`, icon: <Camera className="w-4 h-4" /> },
  ];

  if (!session) return <div className="pt-32 text-center"><p className="text-gray-400">يرجى تسجيل الدخول</p></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8" data-aos="fade-down">
          <h1 className="text-2xl md:text-3xl font-black">لوحة التحكم <span className="text-red-600">• {profile?.restaurantName || 'المطعم'}</span></h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className={`w-2.5 h-2.5 rounded-full ${profile?.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
            {profile?.isActive ? 'الحساب مفعّل' : 'الحساب غير مفعّل'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto mb-8 pb-2 no-scrollbar" data-aos="fade-up">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === t.id ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-red-200'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {activeTab === 'overview' && (
          <div data-aos="fade-up" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'المتابعين', value: profile?.followersCount || profile?._count?.followers || 0, color: 'text-red-600', bg: 'bg-red-50', icon: <Users className="w-5 h-5" /> },
                { label: 'التقييم', value: profile?.avgRating || 0, color: 'text-amber-500', bg: 'bg-amber-50', icon: <Star className="w-5 h-5" /> },
                { label: 'أصناف القائمة', value: profile?._count?.menuItems || profile?.menuItemsCount || 0, color: 'text-green-600', bg: 'bg-green-50', icon: <Utensils className="w-5 h-5" /> },
                { label: 'المنشورات', value: posts.length, color: 'text-purple-600', bg: 'bg-purple-50', icon: <Tag className="w-5 h-5" /> },
                { label: 'الريلز', value: reels.length, color: 'text-rose-600', bg: 'bg-rose-50', icon: <Film className="w-5 h-5" /> },
                { label: 'الحالات', value: stories.length, color: 'text-cyan-600', bg: 'bg-cyan-50', icon: <Camera className="w-5 h-5" /> },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}>{s.icon}</div>
                  <p className="text-2xl md:text-3xl font-black">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-4">إجراءات سريعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 transition text-gray-600 text-sm font-bold">
                  <Pencil className="w-5 h-5" /> تعديل البروفايل
                </button>
                <button onClick={openCreatePost} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 transition text-gray-600 text-sm font-bold">
                  <Plus className="w-5 h-5" /> إنشاء منشور
                </button>
                <button onClick={openCreateReel} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 transition text-gray-600 text-sm font-bold">
                  <Video className="w-5 h-5" /> إضافة ريلز
                </button>
                <button onClick={openCreateStory} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 transition text-gray-600 text-sm font-bold">
                  <Camera className="w-5 h-5" /> إضافة حالة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ PROFILE TAB ════════════ */}
        {activeTab === 'profile' && (
          <div data-aos="fade-up" className="space-y-6">
            {/* Logo & Cover */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="relative h-40 md:h-56 bg-gradient-to-l from-red-100 to-amber-50">
                {pf.coverImage && <img src={pf.coverImage} alt="غلاف" className="w-full h-full object-cover" />}
                <label className="absolute bottom-3 left-3 bg-black/50 hover:bg-black/70 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition flex items-center gap-1">
                  <ImagePlus className="w-3.5 h-3.5" /> تغيير الغلاف
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
              </div>
              <div className="px-6 pb-6 -mt-12 relative">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                    {pf.logo ? <img src={pf.logo} alt="شعار" className="w-full h-full object-cover" /> : <Store className="w-10 h-10 text-gray-300" />}
                  </div>
                  <label className="absolute -bottom-1 -left-1 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition shadow">
                    <Pencil className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-5 flex items-center gap-2"><Edit3 className="w-5 h-5 text-red-500" /> معلومات المطعم</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">اسم المطعم *</label>
                  <input value={pf.restaurantName} onChange={e => setPf(p => ({ ...p, restaurantName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">التصنيف</label>
                  <select value={pf.category} onChange={e => setPf(p => ({ ...p, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">اختر التصنيف</option>
                    {cuisineCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">الوصف</label>
                  <textarea value={pf.description} onChange={e => setPf(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">واتساب *</label>
                  <input value={pf.whatsapp} onChange={e => setPf(p => ({ ...p, whatsapp: e.target.value }))} dir="ltr" placeholder="+249XXXXXXXXX" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">الهاتف</label>
                  <input value={pf.phone} onChange={e => setPf(p => ({ ...p, phone: e.target.value }))} dir="ltr" placeholder="+249XXXXXXXXX" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">العنوان</label>
                  <input value={pf.address} onChange={e => setPf(p => ({ ...p, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">المدينة</label>
                  <select value={pf.city} onChange={e => setPf(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">اختر المدينة</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">المنطقة</label>
                  <input value={pf.area} onChange={e => setPf(p => ({ ...p, area: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">نوع المطبخ</label>
                  <input value={pf.cuisineType} onChange={e => setPf(p => ({ ...p, cuisineType: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">أوقات العمل</label>
                  <input value={pf.openingHours} onChange={e => setPf(p => ({ ...p, openingHours: e.target.value }))} placeholder="مثال: 10ص - 11م" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">الموقع الإلكتروني</label>
                  <div className="relative">
                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={pf.website} onChange={e => setPf(p => ({ ...p, website: e.target.value }))} dir="ltr" placeholder="https://example.com" className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 md:col-span-2">
                  <div>
                    <p className="font-bold text-sm text-gray-700">خدمة التوصيل</p>
                    <p className="text-xs text-gray-500">تفعيل توصيل الطلبات للعملاء</p>
                  </div>
                  <button onClick={() => setPf(p => ({ ...p, deliveryAvailable: !p.deliveryAvailable }))}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${pf.deliveryAvailable ? 'bg-red-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${pf.deliveryAvailable ? 'left-0.5' : 'left-7'}`} />
                  </button>
                </div>
                {pf.deliveryAvailable && (
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">الحد الأدنى للطلب</label>
                    <input type="number" value={pf.minOrderAmount || ''} onChange={e => setPf(p => ({ ...p, minOrderAmount: Number(e.target.value) || 0 }))} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={saveProfile} disabled={saving} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-500/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ POSTS TAB ════════════ */}
        {activeTab === 'posts' && (
          <div data-aos="fade-up" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">المنشورات</h3>
              <button onClick={openCreatePost} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-red-500/20">
                <Plus className="w-4 h-4" /> إنشاء منشور
              </button>
            </div>
            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">لا توجد منشورات بعد</p>
                <button onClick={openCreatePost} className="mt-4 text-red-600 font-bold text-sm hover:underline">أنشئ أول منشور</button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((p: any) => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {postTypeLabels[p.type] && <span className={`${postTypeLabels[p.type].color} text-xs px-2.5 py-1 rounded-full font-bold`}>{postTypeLabels[p.type].label}</span>}
                        {p.discountPercentage && <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">خصم {p.discountPercentage}%</span>}
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.createdAt).toLocaleDateString('ar-SD')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditPost(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'post', id: p.id })} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                    {p.media && p.media.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                        {p.media.map((m: any, i: number) => (
                          <div key={i} className="relative flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-gray-100">
                            <img src={m.url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {(p.startDate || p.endDate) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {p.startDate && <span>من: {new Date(p.startDate).toLocaleDateString('ar-SD')}</span>}
                        {p.endDate && <span>إلى: {new Date(p.endDate).toLocaleDateString('ar-SD')}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p._count?.likes || p.likesCount || 0} إعجاب</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p._count?.comments || p.commentsCount || 0} تعليق</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ REELS TAB ════════════ */}
        {activeTab === 'reels' && (
          <div data-aos="fade-up" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">الريلز</h3>
              <button onClick={openCreateReel} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-red-500/20">
                <Video className="w-4 h-4" /> إضافة ريلز
              </button>
            </div>
            {reels.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Film className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">لا توجد ريلز بعد</p>
                <button onClick={openCreateReel} className="mt-4 text-red-600 font-bold text-sm hover:underline">أضف أول ريلز</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reels.map((r: any) => (
                  <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                    <div className="relative h-48 bg-gray-900">
                      {r.thumbnailUrl ? (
                        <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                      <button onClick={() => setDeleteTarget({ type: 'reel', id: r.id })} className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 hover:bg-red-600 text-white transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      {r.caption && <p className="text-sm text-gray-700 mb-2 line-clamp-2">{r.caption}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {r.viewsCount || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {r.likesCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ STORIES TAB ════════════ */}
        {activeTab === 'stories' && (
          <div data-aos="fade-up" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">الحالات</h3>
              <button onClick={openCreateStory} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-red-500/20">
                <Plus className="w-4 h-4" /> إضافة حالة
              </button>
            </div>
            {stories.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">لا توجد حالات نشطة</p>
                <button onClick={openCreateStory} className="mt-4 text-red-600 font-bold text-sm hover:underline">أضف أول حالة</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {stories.map((s: any) => (
                  <div key={s.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                    <div className="h-48 relative overflow-hidden">
                      {s.mediaUrl ? (
                        <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : s.content ? (
                        <div className="w-full h-full flex items-center justify-center p-4" style={{ backgroundColor: s.bgColor || '#EF4444' }}>
                          <p className="text-white text-center font-bold text-lg leading-relaxed">{s.content}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Camera className="w-8 h-8 text-gray-300" /></div>
                      )}
                      <button onClick={() => setDeleteTarget({ type: 'story', id: s.id })} className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 hover:bg-red-600 text-white transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {s.expiresAt && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg">
                          <Clock className="w-3 h-3 inline ml-1" /> {new Date(s.expiresAt).toLocaleDateString('ar-SD')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-16" />

      {/* ════════════ POST DIALOG ════════════ */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editPostId ? 'تعديل المنشور' : 'إنشاء منشور جديد'}</DialogTitle>
            <DialogDescription>أضف محتوى للمنشور واختر النوع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">نوع المنشور</label>
              <select value={postForm.type} onChange={e => setPostForm(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                {Object.entries(postTypeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">المحتوى *</label>
              <textarea value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="اكتب محتوى المنشور..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
            {postForm.type === 'OFFER' && (
              <div>
                <label className="block text-sm font-bold mb-1.5">نسبة الخصم (%)</label>
                <input type="number" value={postForm.discountPercentage} onChange={e => setPostForm(p => ({ ...p, discountPercentage: e.target.value }))} placeholder="مثال: 20" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1.5">تاريخ البداية</label>
                <input type="date" value={postForm.startDate} onChange={e => setPostForm(p => ({ ...p, startDate: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5">تاريخ النهاية</label>
                <input type="date" value={postForm.endDate} onChange={e => setPostForm(p => ({ ...p, endDate: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
            {/* Image upload */}
            <div>
              <label className="block text-sm font-bold mb-1.5">الصور المرفقة</label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <ImagePlus className="w-5 h-5 text-gray-400" />}
                <span className="text-sm text-gray-500">{uploading ? 'جاري الرفع...' : 'اضغط لإضافة صور'}</span>
                <input type="file" accept="image/*" multiple onChange={handlePostMediaUpload} className="hidden" />
              </label>
              {postMedia.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {postMedia.map((m, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 group/img">
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePostMedia(i)} className="absolute top-0.5 left-0.5 bg-black/50 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={savePost} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : (editPostId ? 'تحديث المنشور' : 'نشر المنشور')}
            </button>
            <button onClick={() => setPostOpen(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-bold">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ REEL DIALOG ════════════ */}
      <Dialog open={reelOpen} onOpenChange={setReelOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">إضافة ريلز جديد</DialogTitle>
            <DialogDescription>ارفع فيديو وأضف وصف</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">الفيديو *</label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <Video className="w-5 h-5 text-gray-400" />}
                <span className="text-sm text-gray-500">{uploading ? 'جاري الرفع...' : (reelForm.videoUrl ? 'تم الرفع ✓ — اضغط لتغيير' : 'اضغط لرفع الفيديو')}</span>
                <input type="file" accept="video/*" onChange={handleReelVideoUpload} className="hidden" />
              </label>
              {reelForm.videoUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  <Check className="w-3.5 h-3.5" /> تم رفع الفيديو بنجاح
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">الصورة المصغرة</label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                <span className="text-sm text-gray-500">{uploading ? 'جاري الرفع...' : (reelForm.thumbnailUrl ? 'تم الرفع ✓ — اضغط لتغيير' : 'اختيار صورة (اختياري)')}</span>
                <input type="file" accept="image/*" onChange={handleReelThumbUpload} className="hidden" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">الوصف</label>
              <textarea value={reelForm.caption} onChange={e => setReelForm(p => ({ ...p, caption: e.target.value }))} rows={2} placeholder="أضف وصف للريلز..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={saveReel} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : 'إضافة الريلز'}
            </button>
            <button onClick={() => setReelOpen(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-bold">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ STORY DIALOG ════════════ */}
      <Dialog open={storyOpen} onOpenChange={setStoryOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">إضافة حالة جديدة</DialogTitle>
            <DialogDescription>أضف صورة أو نص مع لون خلفية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Type selector */}
            <div className="flex gap-2">
              <button onClick={() => setStoryForm(p => ({ ...p, storyType: 'IMAGE' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${storyForm.storyType === 'IMAGE' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <ImageIcon className="w-4 h-4" /> صورة
              </button>
              <button onClick={() => setStoryForm(p => ({ ...p, storyType: 'TEXT' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${storyForm.storyType === 'TEXT' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Hash className="w-4 h-4" /> نص
              </button>
            </div>
            {storyForm.storyType === 'IMAGE' ? (
              <div>
                <label className="block text-sm font-bold mb-1.5">الصورة *</label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-red-500" /> : <ImagePlus className="w-6 h-6 text-gray-400" />}
                  <span className="text-sm text-gray-500">{uploading ? 'جاري الرفع...' : (storyForm.mediaUrl ? 'تم الرفع ✓ — اضغط لتغيير' : 'اضغط لرفع الصورة')}</span>
                  <input type="file" accept="image/*" onChange={handleStoryUpload} className="hidden" />
                </label>
                {storyForm.mediaUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 h-48">
                    <img src={storyForm.mediaUrl} alt="معاينة" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">نص الحالة *</label>
                  <textarea value={storyForm.content} onChange={e => setStoryForm(p => ({ ...p, content: e.target.value }))} rows={3} placeholder="اكتب نص الحالة..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">لون الخلفية</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#1F2937', '#000000'].map(c => (
                      <button key={c} onClick={() => setStoryForm(p => ({ ...p, bgColor: c }))}
                        className={`w-10 h-10 rounded-xl transition-transform hover:scale-110 ${storyForm.bgColor === c ? 'ring-2 ring-offset-2 ring-red-500 scale-110' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                {/* Preview */}
                {storyForm.content && (
                  <div className="h-48 rounded-xl overflow-hidden" style={{ backgroundColor: storyForm.bgColor }}>
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <p className="text-white text-center font-bold text-lg leading-relaxed">{storyForm.content}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={saveStory} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : 'نشر الحالة'}
            </button>
            <button onClick={() => setStoryOpen(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-bold">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ DELETE CONFIRM DIALOG ════════════ */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">تأكيد الحذف</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <button onClick={() => {
              if (deleteTarget) {
                if (deleteTarget.type === 'post') deletePost(deleteTarget.id);
                else if (deleteTarget.type === 'reel') deleteReel(deleteTarget.id);
                else if (deleteTarget.type === 'story') deleteStory(deleteTarget.id);
              }
            }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition">حذف</button>
            <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-bold py-2.5">إلغاء</button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </motion.div>
  );
}

/* ============================================================
   ALGORITHM DASHBOARD
   ============================================================ */

function AlgorithmDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlgorithmData = useCallback(async () => {
    try {
      const [dashRes, metricsRes] = await Promise.all([
        fetch('/api/algorithm/dashboard'),
        fetch('/api/algorithm/metrics'),
      ]);
      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (metricsRes.ok) setMetricsData(await metricsRes.json());
    } catch (err) {
      console.error('Algorithm dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlgorithmData(); }, [fetchAlgorithmData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlgorithmData();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-8 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-12 bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const s = dashboardData?.summary || {};
  const irr = parseFloat(s.irr || 0);
  const irrColor = irr >= 70 ? 'text-green-600 bg-green-50' : irr >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-6" data-aos="fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">لوحة <span className="text-red-600">الخوارزمية</span></h2>
          <p className="text-gray-500 text-sm mt-1">مراقبة أداء خوارزمية Adaptive Engagement Flow (EFS)</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm transition">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
        </button>
      </div>

      {/* IRR Banner */}
      <div className={`rounded-2xl p-6 border-2 ${irr >= 70 ? 'bg-gradient-to-l from-green-50 to-emerald-50 border-green-200' : irr >= 50 ? 'bg-gradient-to-l from-amber-50 to-yellow-50 border-amber-200' : 'bg-gradient-to-l from-red-50 to-orange-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">معدل الاحتفاظ الفوري (IRR)</p>
            <p className="text-5xl font-black">{irr.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-2">
              {irr >= 70 ? 'ممتاز - تفوق على تيك توك' : irr >= 50 ? 'جيد - بمستوى تيك توك' : 'يحتاج تحسين'}
            </p>
          </div>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${irrColor}`}>
            <Eye className="w-12 h-12" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 text-xs">
          <span className="bg-white/60 px-2 py-1 rounded-full font-bold">الهدف: 73%</span>
          <span className="bg-white/60 px-2 py-1 rounded-full font-bold">تيك توك: 52%</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'تفاعلات اليوم', value: s.todayInteractions || 0, change: s.changeFromYesterday, icon: <BarChart3 className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'مستخدمون نشطون', value: s.activeUsersToday || 0, icon: <Users className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'متوسط مدة المشاهدة', value: `${s.avgWatchDuration || 0} ثانية`, icon: <Eye className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'نسبة الإكمال', value: `${s.avgCompletionRate || 0}%`, icon: <Play className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'تفاعلات الأسبوع', value: s.weekInteractions || 0, icon: <Flame className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'نسبة الاستكشاف', value: `${dashboardData?.exploration?.rate || 5}%`, icon: <Search className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'نسبة كاش الضرب', value: `${((metricsData?.cacheHitRate || 0) * 100).toFixed(0)}%`, icon: <Zap className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'تفاعلات أمس', value: s.yesterdayInteractions || 0, icon: <Clock className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${m.bg} ${m.color} flex items-center justify-center mb-3`}>{m.icon}</div>
            <p className="text-2xl font-black">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            {m.change && (
              <p className={`text-xs mt-1 font-bold ${parseFloat(m.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(m.change) >= 0 ? '+' : '-'} {Math.abs(parseFloat(m.change))}%
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> اتجاه التفاعلات اليومية</h3>
          {dashboardData?.dailyTrend && dashboardData.dailyTrend.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.dailyTrend.map((d: any, i: number) => {
                const maxVal = Math.max(...dashboardData.dailyTrend.map((x: any) => x.interactions), 1);
                const width = (d.interactions / maxVal) * 100;
                const isToday = i === dashboardData.dailyTrend.length - 1;
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 text-left" dir="ltr">{d.date}</span>
                    <div className="flex-1 bg-gray-50 rounded-full h-6 relative overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isToday ? 'bg-gradient-to-l from-red-500 to-red-400' : 'bg-gradient-to-l from-blue-500 to-blue-300'}`}
                        style={{ width: `${Math.max(width, 2)}%` }} />
                    </div>
                    <span className="text-xs font-bold w-16 text-left" dir="ltr">{d.interactions}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات بعد</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-red-500" /> التفاعلات حسب النوع (اليوم)</h3>
          {(dashboardData?.byType || []).length > 0 ? (
            <div className="space-y-3">
              {(dashboardData.byType || []).map((t: any) => {
                const typeLabels: Record<string, string> = {
                  VIEW: 'مشاهدة', LIKE: 'إعجاب', COMMENT: 'تعليق', SHARE: 'مشاركة',
                  SAVE: 'حفظ', SCROLL_PAST: 'تمرير', REWATCH: 'إعادة مشاهدة', COMPLETE_WATCH: 'مشاهدة كاملة',
                };
                const totalByType = (dashboardData.byType || []).reduce((sum: number, x: any) => sum + x.count, 0) || 1;
                const pct = (t.count / totalByType * 100).toFixed(0);
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-24 text-right">{typeLabels[t.type] || t.type}</span>
                    <div className="flex-1 bg-gray-50 rounded-full h-5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-red-500 to-orange-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold w-20 text-left" dir="ltr">{t.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">لا توجد تفاعلات اليوم</p>
          )}
        </div>
      </div>

      {/* Content & Exploration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> أعلى 10 محتوى تفاعلاً</h3>
          {(dashboardData?.topContent || []).length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(dashboardData.topContent || []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{c.contentType}</span>
                    <span className="text-gray-600">محتوى #{c.contentId}</span>
                  </div>
                  <span className="font-bold text-red-600">{c._count.id}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Search className="w-4 h-4 text-teal-500" /> آلية الاستكشاف A/B</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-teal-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-teal-600">{dashboardData?.exploration?.explorationUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">مستخدمي الاستكشاف</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-blue-600">{dashboardData?.exploration?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">إجمالي المستخدمين</p>
              </div>
            </div>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-center">
              <span className="font-bold">النسبة:</span> {dashboardData?.exploration?.rate || 5}% — الهدف: 5%
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
            <h3 className="font-bold mb-3 text-sm">معادلة EFS</h3>
            <p className="text-xs font-mono text-gray-300 mb-3 text-center" dir="ltr">
              EFS = (w1*R + w2*T + w3*C + w4*S + w5*H + w6*U) * D
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-red-400">R</span> التفاعلات</div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-blue-400">T</span> الإكمال</div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-green-400">C</span> التشابه</div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-amber-400">S</span> الاجتماعية</div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-purple-400">H</span> التاريخ</div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><span className="font-bold text-teal-400">U</span> التوقيت</div>
            </div>
            <p className="text-xs text-center mt-2 text-gray-400">D = تلاشي زمني غير خطي</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN VIEW (WordPress-like Dashboard)
   ============================================================ */

function AdminView() {
  const { session } = useApp();
  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subStats, setSubStats] = useState<any>({});
  const [settings, setSettings] = useState<any>({});
  const [adminLoading, setAdminLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '', email: '', role: '', phone: '', password: '', isActive: true,
  });

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    name: '', nameEn: '', price: 0, duration: 30, durationUnit: 'DAY',
    features: '', maxMenuItems: 10, maxPosts: 5, maxStories: 3,
    maxReels: 1, maxServices: 3, isActive: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: string; id: number; name: string;
  } | null>(null);

  // Subscription dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [subForm, setSubForm] = useState({
    userId: '', planId: '', status: 'PENDING', startDate: '', endDate: '',
    paymentRef: '', paymentMethod: '', notes: '',
  });
  const [subSaving, setSubSaving] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState('');

  const adminTabs = [
    { id: 'overview', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'algorithm', label: 'الخوارزمية', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: 'المستخدمين', icon: <Users className="w-4 h-4" /> },
    { id: 'restaurants', label: 'المطاعم', icon: <Store className="w-4 h-4" /> },
    { id: 'subscriptions', label: 'الاشتراكات', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'posts', label: 'المنشورات', icon: <Tag className="w-4 h-4" /> },
    { id: 'reviews', label: 'التقييمات', icon: <Star className="w-4 h-4" /> },
    { id: 'plans', label: 'الخطط', icon: <Gift className="w-4 h-4" /> },
    { id: 'settings', label: 'الإعدادات', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const fetchAdminData = useCallback(async () => {
    if (!session) return;
    setAdminLoading(true);
    try {
      const [sRes, uRes, rRes, pRes, revRes, plRes, setRes, subRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/restaurants'),
        fetch('/api/posts'),
        fetch('/api/admin/reviews'),
        fetch('/api/plans?all=true'),
        fetch('/api/platform-settings'),
        fetch('/api/admin/subscriptions'),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (uRes.ok) { const d = await uRes.json(); setUsers(Array.isArray(d.users) ? d.users : []); }
      if (rRes.ok) { const d = await rRes.json(); setRestaurants(Array.isArray(d) ? d : []); }
      if (pRes.ok) { const d = await pRes.json(); setPosts(Array.isArray(d) ? d : []); }
      if (revRes.ok) { const d = await revRes.json(); setReviews(Array.isArray(d) ? d : []); }
      if (plRes.ok) { const d = await plRes.json(); setPlans(Array.isArray(d.plans) ? d.plans : []); }
      if (setRes.ok) { const d = await setRes.json(); setSettings(d.settings || {}); }
      if (subRes.ok) { const d = await subRes.json(); setSubscriptions(Array.isArray(d.subscriptions) ? d.subscriptions : []); setSubStats(d.stats || {}); }
    } catch (err) { console.error('Admin fetch error:', err); }
    finally { setAdminLoading(false); }
  }, [session]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  /* ── User Actions ── */
  const openEditUser = (u: any) => {
    setEditUser(u);
    setEditUserForm({
      name: u.name, email: u.email, role: u.role,
      phone: u.phone || '', password: '',
      isActive: u.restaurantProfile?.isActive ?? true,
    });
    setEditUserOpen(true);
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: any = { ...editUserForm };
      if (!body.password) delete body.password;
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('تم تحديث المستخدم');
        setEditUserOpen(false);
        fetchAdminData();
      } else {
        toast.error('فشل التحديث');
      }
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم حذف المستخدم');
        setDeleteConfirm(null);
        fetchAdminData();
      } else {
        const d = await res.json();
        toast.error(d.error || 'فشل الحذف');
      }
    } catch { toast.error('حدث خطأ'); }
  };

  const toggleUserStatus = async (u: any) => {
    try {
      const newActive = !(u.restaurantProfile?.isActive ?? true);
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (res.ok) {
        toast.success(newActive ? 'تم تفعيل الحساب' : 'تم تجميد الحساب');
        fetchAdminData();
      } else { toast.error('فشل التحديث'); }
    } catch { toast.error('حدث خطأ'); }
  };

  const toggleVerify = async (u: any) => {
    try {
      const newVerified = !u.restaurantProfile?.isVerified;
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: newVerified }),
      });
      if (res.ok) {
        toast.success(newVerified ? 'تم توثيق المطعم' : 'تم إلغاء التوثيق');
        fetchAdminData();
      } else { toast.error('فشل التحديث'); }
    } catch { toast.error('حدث خطأ'); }
  };

  const deletePost = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم حذف المنشور');
        setDeleteConfirm(null);
        fetchAdminData();
      } else { toast.error('فشل الحذف'); }
    } catch { toast.error('حدث خطأ'); }
  };

  const deleteReview = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم حذف التقييم');
        setDeleteConfirm(null);
        fetchAdminData();
      } else { toast.error('فشل الحذف'); }
    } catch { toast.error('حدث خطأ'); }
  };

  /* ── Settings ── */
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success('تم حفظ الإعدادات');
      else toast.error('فشل الحفظ');
    } catch { toast.error('حدث خطأ'); }
    finally { setSaving(false); }
  };

  /* ── Subscription Actions ── */
  const openNewSub = () => {
    setEditSub(null);
    setSubForm({ userId: '', planId: '', status: 'PENDING', startDate: new Date().toISOString().split('T')[0], endDate: '', paymentRef: '', paymentMethod: '', notes: '' });
    setSubDialogOpen(true);
  };

  const openEditSub = (sub: any) => {
    setEditSub(sub);
    setSubForm({
      userId: String(sub.userId), planId: String(sub.planId), status: sub.status,
      startDate: sub.startDate?.split('T')[0] || '', endDate: sub.endDate?.split('T')[0] || '',
      paymentRef: sub.paymentRef || '', paymentMethod: sub.paymentMethod || '', notes: sub.notes || '',
    });
    setSubDialogOpen(true);
  };

  const saveSubscription = async () => {
    setSubSaving(true);
    try {
      const url = editSub ? `/api/admin/subscriptions/${editSub.id}` : '/api/admin/subscriptions';
      const method = editSub ? 'PUT' : 'POST';
      const body = { ...subForm };
      if (!body.endDate) delete body.endDate;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editSub ? 'تم تحديث الاشتراك' : 'تم إنشاء الاشتراك');
        setSubDialogOpen(false);
        fetchAdminData();
      } else {
        const d = await res.json();
        toast.error(d.error || 'فشل العملية');
      }
    } catch { toast.error('حدث خطأ'); }
    finally { setSubSaving(false); }
  };

  const activateSubscription = async (sub: any) => {
    setSubSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      if (res.ok) {
        toast.success('تم تفعيل الاشتراك بنجاح! ✅');
        fetchAdminData();
      } else toast.error('فشل التفعيل');
    } catch { toast.error('حدث خطأ'); }
    finally { setSubSaving(false); }
  };

  const cancelSubscription = async (sub: any) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        toast.success('تم إلغاء الاشتراك');
        fetchAdminData();
      } else toast.error('فشل الإلغاء');
    } catch { toast.error('حدث خطأ'); }
  };

  const deleteSubscription = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم حذف الاشتراك');
        setDeleteConfirm(null);
        fetchAdminData();
      } else toast.error('فشل الحذف');
    } catch { toast.error('حدث خطأ'); }
  };

  const subStatusLabel = (s: string) => ({
    PENDING: { label: 'بانتظار الدفع', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-700', icon: <Check className="w-3 h-3" /> },
    EXPIRED: { label: 'منتهي', color: 'bg-gray-100 text-gray-600', icon: <AlertCircle className="w-3 h-3" /> },
    CANCELLED: { label: 'ملغى', color: 'bg-red-100 text-red-700', icon: <Ban className="w-3 h-3" /> },
  }[s] || { label: s, color: 'bg-gray-100 text-gray-600', icon: null });

  const filteredSubs = subscriptions.filter((s: any) => {
    if (subStatusFilter && s.status !== subStatusFilter) return false;
    return true;
  });

  const restaurantUsers = users.filter((u: any) => u.role === 'RESTAURANT');


  if (!session) return <div className="pt-32 text-center"><p className="text-gray-400">يرجى تسجيل الدخول</p></div>;

  const filteredUsers = users.filter((u: any) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (searchQuery && !u.name?.includes(searchQuery) && !u.email?.includes(searchQuery)) return false;
    return true;
  });

  const getUserStatus = (u: any) => {
    if (u.role === 'ADMIN') return { label: 'مدير', color: 'bg-purple-100 text-purple-700' };
    if (!u.restaurantProfile) return { label: 'عميل', color: 'bg-blue-100 text-blue-700' };
    if (!u.restaurantProfile.isActive) return { label: 'مجمّد', color: 'bg-red-100 text-red-700' };
    if (!u.restaurantProfile.isVerified) return { label: 'غير موثق', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'نشط', color: 'bg-green-100 text-green-700' };
  };

  const getRoleLabel = (role: string) => ({ ADMIN: 'مدير', RESTAURANT: 'مطعم', CUSTOMER: 'عميل' }[role] || role);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-28 pb-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black" data-aos="fade-down">لوحة <span className="text-red-600">الإدارة</span></h1>
            <p className="text-gray-500 mt-1">إدارة كاملة لجميع محتوى المنصة</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
            <Check className="w-4 h-4" /> مرحباً، {session.user?.name}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-gray-100" data-aos="fade-up">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeAdminTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {adminLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-8 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-12 bg-gray-50 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ═══ OVERVIEW TAB ═══ */}
            {activeAdminTab === 'overview' && (
              <div className="space-y-8" data-aos="fade-up">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'المستخدمين', value: stats?.totalUsers || 0, icon: <Users className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'المطاعم', value: stats?.totalRestaurants || 0, icon: <Store className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'مطاعم نشطة', value: stats?.activeRestaurants || 0, icon: <Check className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'أصناف الطعام', value: stats?.totalMenuItems || 0, icon: <Utensils className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'التقييمات', value: stats?.totalReviews || 0, icon: <Star className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'المنشورات', value: stats?.totalPosts || 0, icon: <Tag className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'الإعجابات', value: stats?.totalLikes || 0, icon: <Heart className="w-5 h-5" />, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { label: 'المتابعات', value: stats?.totalFollows || 0, icon: <Users className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                        {s.icon}
                      </div>
                      <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recent Users */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" /> آخر المستخدمين المسجلين
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {(stats?.recentUsers || []).map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                              {(u.name || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{u.name}</p>
                              <p className="text-[10px] text-gray-400">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                              {getRoleLabel(u.role)}
                            </span>
                            {u.restaurantProfile && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                u.restaurantProfile.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {u.restaurantProfile.isActive ? 'نشط' : 'مجمّد'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                        <div className="p-6 text-center text-gray-400 text-sm">لا يوجد مستخدمين بعد</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Reviews */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-bold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" /> آخر التقييمات
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {(stats?.recentReviews || []).map((r: any) => (
                        <div key={r.id} className="p-3 hover:bg-gray-50 transition">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold">{r.user?.name}</p>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{r.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {r.restaurant?.restaurantName} • {new Date(r.createdAt).toLocaleDateString('ar-SD')}
                          </p>
                        </div>
                      ))}
                      {(!stats?.recentReviews || stats.recentReviews.length === 0) && (
                        <div className="p-6 text-center text-gray-400 text-sm">لا توجد تقييمات بعد</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ ALGORITHM TAB ═══ */}
            {activeAdminTab === 'algorithm' && (
              <AlgorithmDashboard />
            )}

            {/* ═══ USERS TAB ═══ */}
            {activeAdminTab === 'users' && (
              <div className="space-y-6" data-aos="fade-up">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="ابحث بالاسم أو البريد..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="">كل الأدوار</option>
                    <option value="CUSTOMER">عملاء</option>
                    <option value="RESTAURANT">مطاعم</option>
                    <option value="ADMIN">مديرين</option>
                  </select>
                  <div className="text-sm text-gray-500">{filteredUsers.length} مستخدم</div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">المستخدم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">البريد</th>
                          <th className="px-4 py-3 font-bold text-gray-600">الدور</th>
                          <th className="px-4 py-3 font-bold text-gray-600">الحالة</th>
                          <th className="px-4 py-3 font-bold text-gray-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map((u: any) => {
                          const status = getUserStatus(u);
                          return (
                            <tr key={u.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {(u.name || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold">{u.name}</p>
                                    {u.restaurantProfile?.restaurantName && (
                                      <p className="text-[10px] text-gray-400">{u.restaurantProfile.restaurantName}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                  u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700'
                                  : u.role === 'RESTAURANT' ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {getRoleLabel(u.role)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditUser(u)}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                                    title="تعديل"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {u.role === 'RESTAURANT' && u.restaurantProfile && (
                                    <>
                                      <button
                                        onClick={() => toggleUserStatus(u)}
                                        className={`p-1.5 rounded-lg transition ${
                                          u.restaurantProfile.isActive
                                            ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                                            : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                                        }`}
                                        title={u.restaurantProfile.isActive ? 'تجميد' : 'تفعيل'}
                                      >
                                        {u.restaurantProfile.isActive ? <XCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={() => toggleVerify(u)}
                                        className={`p-1.5 rounded-lg transition ${
                                          u.restaurantProfile.isVerified
                                            ? 'hover:bg-yellow-50 text-amber-500'
                                            : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                                        }`}
                                        title={u.restaurantProfile.isVerified ? 'إلغاء التوثيق' : 'توثيق'}
                                      >
                                        <Shield className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {u.role !== 'ADMIN' && (
                                    <button
                                      onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.name })}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                                      title="حذف"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-gray-400">لا يوجد مستخدمين</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ RESTAURANTS TAB ═══ */}
            {activeAdminTab === 'restaurants' && (
              <div className="space-y-6" data-aos="fade-up">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="ابحث عن مطعم..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">المطعم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">المدينة</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التصنيف</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التقييم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">الحالة</th>
                          <th className="px-4 py-3 font-bold text-gray-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {restaurants
                          .filter((r: any) => !searchQuery || r.restaurantName?.includes(searchQuery) || r.city?.includes(searchQuery))
                          .map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 font-bold">
                                {r.restaurantName}
                                <p className="text-[10px] text-gray-400 font-normal">{r.user?.email}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-500">{r.city}{r.area ? ` • ${r.area}` : ''}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 font-bold">{r.category}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-bold">{r.avgRating?.toFixed(1) || '0'}</span>
                                  <span className="text-[10px] text-gray-400">({r.ratingsCount || 0})</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {r.isVerified && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">موثق</span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    r.isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {r.isActive ? 'نشط' : 'معطل'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleVerify(r)}
                                    className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition"
                                    title={r.isVerified ? 'إلغاء التوثيق' : 'توثيق'}
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>
                                  {r.userId && (
                                    <button
                                      onClick={() => toggleUserStatus({
                                        ...r, id: r.userId,
                                        restaurantProfile: { isActive: r.isActive, isVerified: r.isVerified },
                                      })}
                                      className={`p-1.5 rounded-lg transition ${
                                        r.isActive
                                          ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                                          : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                                      }`}
                                      title={r.isActive ? 'تعطيل' : 'تفعيل'}
                                    >
                                      {r.isActive ? <XCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        {restaurants.filter((r: any) => !searchQuery || r.restaurantName?.includes(searchQuery) || r.city?.includes(searchQuery)).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-400">لا توجد مطاعم</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SUBSCRIPTIONS TAB ═══ */}
            {activeAdminTab === 'subscriptions' && (
              <div className="space-y-6" data-aos="fade-up">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><CreditCard className="w-5 h-5" /></div>
                    <p className="text-2xl font-black">{subStats.total || 0}</p>
                    <p className="text-xs text-gray-500">إجمالي الاشتراكات</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3"><Check className="w-5 h-5" /></div>
                    <p className="text-2xl font-black text-green-600">{subStats.active || 0}</p>
                    <p className="text-xs text-gray-500">اشتراكات نشطة</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-3"><Clock className="w-5 h-5" /></div>
                    <p className="text-2xl font-black text-yellow-600">{subStats.pending || 0}</p>
                    <p className="text-xs text-gray-500">بانتظار التفعيل</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3"><CircleDollarSign className="w-5 h-5" /></div>
                    <p className="text-2xl font-black text-purple-600">{(subStats.revenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">إيرادات SDG</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: '', label: 'الكل' },
                      { id: 'PENDING', label: 'بانتظار الدفع' },
                      { id: 'ACTIVE', label: 'نشط' },
                      { id: 'EXPIRED', label: 'منتهي' },
                      { id: 'CANCELLED', label: 'ملغى' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSubStatusFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          subStatusFilter === f.id
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={openNewSub}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition shadow-lg shadow-red-500/20"
                  >
                    <Plus className="w-4 h-4" /> إضافة اشتراك جديد
                  </button>
                </div>

                {/* Subscriptions Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">#</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">المستخدم</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">المطعم</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">الخطة</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">السعر</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">الحالة</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">تاريخ البدء</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">تاريخ الانتهاء</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">طريقة الدفع</th>
                          <th className="text-right px-4 py-3 font-bold text-gray-600">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSubs.map((sub: any, idx: number) => {
                          const st = subStatusLabel(sub.status);
                          const isExpired = sub.endDate && new Date(sub.endDate) < new Date() && sub.status === 'ACTIVE';
                          return (
                            <tr key={sub.id} className={`hover:bg-gray-50 transition ${isExpired ? 'bg-red-50/30' : ''}`}>
                              <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-bold">{sub.user?.name || '-'}</p>
                                  <p className="text-[10px] text-gray-400" dir="ltr">{sub.user?.email || '-'}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs">{sub.user?.restaurantProfile?.restaurantName || '-'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-bold text-xs">{sub.plan?.name}</p>
                                  <p className="text-[10px] text-gray-400">{sub.plan?.duration} يوم</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-xs">
                                {sub.plan?.price === 0 ? 'مجاني' : `${sub.plan?.price?.toLocaleString()} ${sub.plan?.currency}`}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${st.color}`}>
                                  {st.icon} {st.label}
                                </span>
                                {isExpired && <span className="block text-[10px] text-red-500 mt-1">⚠️ منتهي الصلاحية</span>}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">{sub.startDate?.split('T')[0] || '-'}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">{sub.endDate?.split('T')[0] || '-'}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">{sub.paymentMethod || '-'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {sub.status === 'PENDING' && (
                                    <button
                                      onClick={() => activateSubscription(sub)}
                                      disabled={subSaving}
                                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                                      title="تفعيل الاشتراك"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {(sub.status === 'ACTIVE' || sub.status === 'PENDING') && (
                                    <button
                                      onClick={() => cancelSubscription(sub)}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                      title="إلغاء الاشتراك"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openEditSub(sub)}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                    title="تعديل"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm({ type: 'subscription', id: sub.id, name: `${sub.user?.name} - ${sub.plan?.name}` })}
                                    className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                                    title="حذف"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredSubs.length === 0 && (
                          <tr>
                            <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                              <p>لا توجد اشتراكات</p>
                              <p className="text-xs mt-1">اضغط "إضافة اشتراك جديد" لإنشاء اشتراك يدوياً بعد التحقق من الدفع</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Workflow Guide */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-800">
                    <MessageCircle className="w-5 h-5" /> كيفية إدارة الاشتراكات
                  </h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    {[
                      { step: '1', title: 'طلب الزبون', desc: 'يضغط الزبون "اشترك الآن" ويتم تحويله لواتساب المنصة', color: 'bg-blue-500' },
                      { step: '2', title: 'تحقق من الدفع', desc: 'تتحقق من وصول المبلغ لحسابك المصرفي عبر التحويل', color: 'bg-amber-500' },
                      { step: '3', title: 'أضف اشتراك', desc: 'اضغط "إضافة اشتراك جديد" واختر المستخدم والخطة', color: 'bg-green-500' },
                      { step: '4', title: 'فعّل الخطة', desc: 'اضغط زر التفعيل الأخضر لتفعيل الاشتراك فوراً', color: 'bg-purple-500' },
                    ].map(s => (
                      <div key={s.step} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className={`w-8 h-8 rounded-full ${s.color} text-white flex items-center justify-center font-black text-sm mb-2`}>
                          {s.step}
                        </div>
                        <p className="font-bold text-sm mb-1">{s.title}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ POSTS TAB ═══ */}
            {activeAdminTab === 'posts' && (
              <div className="space-y-6" data-aos="fade-up">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">المحتوى</th>
                          <th className="px-4 py-3 font-bold text-gray-600">المطعم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">النوع</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التاريخ</th>
                          <th className="px-4 py-3 font-bold text-gray-600">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {posts.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 max-w-xs">
                              <p className="line-clamp-1 text-xs">{p.content}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.restaurant?.restaurantName || '-'}</td>
                            <td className="px-4 py-3">
                              {postTypeLabels[p.type] ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${postTypeLabels[p.type].color}`}>
                                  {postTypeLabels[p.type].label}
                                </span>
                              ) : (
                                <span className="text-xs">{p.type}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-SD') : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDeleteConfirm({ type: 'post', id: p.id, name: 'هذا المنشور' })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {posts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-gray-400">لا توجد منشورات</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REVIEWS TAB ═══ */}
            {activeAdminTab === 'reviews' && (
              <div className="space-y-6" data-aos="fade-up">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">المستخدم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">المطعم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التقييم</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التعليق</th>
                          <th className="px-4 py-3 font-bold text-gray-600">التاريخ</th>
                          <th className="px-4 py-3 font-bold text-gray-600">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reviews.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-xs font-bold">{r.user?.name || '-'}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{r.restaurant?.restaurantName || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="line-clamp-1 text-xs text-gray-600">{r.content}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SD') : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDeleteConfirm({ type: 'review', id: r.id, name: 'هذا التقييم' })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {reviews.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-400">لا توجد تقييمات</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PLANS TAB ═══ */}
            {activeAdminTab === 'plans' && (
              <div className="space-y-6" data-aos="fade-up">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((p: any) => (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl p-5 border-2 ${
                        p.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                      } transition-all`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold">{p.name}</h3>
                        <button
                          onClick={() => {
                            setEditPlan(p);
                            setEditPlanForm({
                              name: p.name, nameEn: p.nameEn, price: p.price,
                              duration: p.duration, durationUnit: p.durationUnit,
                              features: p.features, maxMenuItems: p.maxMenuItems,
                              maxPosts: p.maxPosts, maxStories: p.maxStories,
                              maxReels: p.maxReels, maxServices: p.maxServices,
                              isActive: p.isActive,
                            });
                            setEditPlanOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{p.nameEn}</p>
                      <p className="text-2xl font-black">
                        {p.price === 0 ? 'مجاني' : `${p.price.toLocaleString()} ${p.currency}`}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.duration} {p.durationUnit === 'DAY' ? 'يوم' : 'شهر'}
                      </p>
                      <div className="mt-3 text-[10px] text-gray-500 space-y-1">
                        {p.features?.split('|').slice(0, 3).map((f: string, i: number) => (
                          <p key={i}>✓ {f.trim()}</p>
                        ))}
                        {p.features?.split('|').length > 3 && (
                          <p className="text-gray-400">+{p.features.split('|').length - 3} مميزات أخرى</p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/admin/plans/${p.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: !p.isActive }),
                              });
                              toast.success(p.isActive ? 'تم تعطيل الخطة' : 'تم تفعيل الخطة');
                              fetchAdminData();
                            } catch { toast.error('خطأ'); }
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                            p.isActive
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {p.isActive ? 'مفعّلة ✓' : 'معطّلة ✗'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="col-span-full bg-white rounded-2xl p-12 text-center text-gray-400">
                      لا توجد خطط اشتراك
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ SETTINGS TAB ═══ */}
            {activeAdminTab === 'settings' && (
              <div className="space-y-6 max-w-2xl" data-aos="fade-up">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-red-500" /> إعدادات المنصة
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5">اسم المنصة</label>
                      <input
                        value={settings.platform_name || ''}
                        onChange={e => setSettings(s => ({ ...s, platform_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5">وصف المنصة</label>
                      <textarea
                        value={settings.platform_description || ''}
                        onChange={e => setSettings(s => ({ ...s, platform_description: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5">رقم واتساب الإدارة</label>
                      <input
                        value={settings.admin_whatsapp || ''}
                        onChange={e => setSettings(s => ({ ...s, admin_whatsapp: e.target.value }))}
                        dir="ltr"
                        placeholder="+249XXXXXXXXX"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit User Dialog ── */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-bold mb-1">الاسم</label>
              <input
                value={editUserForm.name}
                onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">البريد</label>
              <input
                value={editUserForm.email}
                onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                dir="ltr"
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">الدور</label>
              <select
                value={editUserForm.role}
                onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              >
                <option value="CUSTOMER">عميل</option>
                <option value="RESTAURANT">مطعم</option>
                <option value="ADMIN">مدير</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">الهاتف</label>
              <input
                value={editUserForm.phone}
                onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))}
                dir="ltr"
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)</label>
              <input
                type="password"
                value={editUserForm.password}
                onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            {editUser?.role === 'RESTAURANT' && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-3">
                <p className="text-xs font-bold text-amber-700">إعدادات المطعم</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">حالة الحساب</span>
                  <button
                    onClick={() => setEditUserForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      editUserForm.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      editUserForm.isActive ? 'left-0.5' : 'left-6'
                    }`} />
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveUser}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                {saving ? 'جاري...' : 'حفظ'}
              </button>
              <button
                onClick={() => setEditUserOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Plan Dialog ── */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">تعديل الخطة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">الاسم (عربي)</label>
                <input
                  value={editPlanForm.name}
                  onChange={e => setEditPlanForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الاسم (إنجليزي)</label>
                <input
                  value={editPlanForm.nameEn}
                  onChange={e => setEditPlanForm(f => ({ ...f, nameEn: e.target.value }))}
                  dir="ltr"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">السعر</label>
                <input
                  type="number"
                  value={editPlanForm.price}
                  onChange={e => setEditPlanForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">المدة (أيام)</label>
                <input
                  type="number"
                  value={editPlanForm.duration}
                  onChange={e => setEditPlanForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">المميزات (افصل بـ |)</label>
              <textarea
                value={editPlanForm.features}
                onChange={e => setEditPlanForm(f => ({ ...f, features: e.target.value }))}
                rows={3}
                className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">أصناف قائمة</label>
                <input
                  type="number"
                  value={editPlanForm.maxMenuItems}
                  onChange={e => setEditPlanForm(f => ({ ...f, maxMenuItems: Number(e.target.value) }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">منشورات</label>
                <input
                  type="number"
                  value={editPlanForm.maxPosts}
                  onChange={e => setEditPlanForm(f => ({ ...f, maxPosts: Number(e.target.value) }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">قصص</label>
                <input
                  type="number"
                  value={editPlanForm.maxStories}
                  onChange={e => setEditPlanForm(f => ({ ...f, maxStories: Number(e.target.value) }))}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  if (!editPlan) return;
                  setSaving(true);
                  try {
                    await fetch(`/api/admin/plans/${editPlan.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editPlanForm),
                    });
                    toast.success('تم تحديث الخطة');
                    setEditPlanOpen(false);
                    fetchAdminData();
                  } catch { toast.error('خطأ'); }
                  finally { setSaving(false); }
                }}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                {saving ? 'جاري...' : 'حفظ'}
              </button>
              <button
                onClick={() => setEditPlanOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            هل أنت متأكد من حذف {deleteConfirm?.name}؟ هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                if (deleteConfirm?.type === 'user') deleteUser(deleteConfirm.id);
                else if (deleteConfirm?.type === 'post') deletePost(deleteConfirm.id);
                else if (deleteConfirm?.type === 'review') deleteReview(deleteConfirm.id);
                else if (deleteConfirm?.type === 'subscription') deleteSubscription(deleteConfirm.id);
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition"
            >
              نعم، احذف
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition"
            >
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Subscription Dialog ── */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editSub ? 'تعديل الاشتراك' : 'إضافة اشتراك جديد'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {editSub ? 'قم بتعديل بيانات الاشتراك' : 'أضف اشتراك جديد بعد التحقق من الدفع'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-bold mb-1">المستخدم (المطعم) <span className="text-red-500">*</span></label>
              <select
                value={subForm.userId}
                onChange={e => setSubForm(f => ({ ...f, userId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">-- اختر المستخدم --</option>
                {restaurantUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.restaurantProfile?.restaurantName ? `(${u.restaurantProfile.restaurantName})` : ''} - {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">خطة الاشتراك <span className="text-red-500">*</span></label>
              <select
                value={subForm.planId}
                onChange={e => setSubForm(f => ({ ...f, planId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">-- اختر الخطة --</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nameEn}) - {p.price === 0 ? 'مجاني' : `${p.price.toLocaleString()} SDG`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">تاريخ البدء <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={subForm.startDate}
                  onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={subForm.endDate}
                  onChange={e => setSubForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">يُحسب تلقائياً من مدة الخطة</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">الحالة</label>
              <select
                value={subForm.status}
                onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="PENDING">بانتظار الدفع</option>
                <option value="ACTIVE">نشط (تم التحقق من الدفع)</option>
                <option value="EXPIRED">منتهي</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">رقم مرجع الدفع</label>
                <input
                  value={subForm.paymentRef}
                  onChange={e => setSubForm(f => ({ ...f, paymentRef: e.target.value }))}
                  placeholder="مثال: TRF-001234"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">طريقة الدفع</label>
                <select
                  value={subForm.paymentMethod}
                  onChange={e => setSubForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">-- اختر --</option>
                  <option value="bank_transfer">تحويل مصرفي</option>
                  <option value="mobile_money">محفظة جوال</option>
                  <option value="cash">نقدي</option>
                  <option value="bank_deposit">إيداع بنكي</option>
                  <option value="check">شيك</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">ملاحظات</label>
              <textarea
                value={subForm.notes}
                onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="ملاحظات إضافية..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>

            {subForm.status === 'ACTIVE' && (
              <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                <p className="text-xs font-bold text-green-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  عند الحفظ بحالة "نشط" سيتم تفعيل الخطة تلقائياً لحساب المستخدم
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={saveSubscription}
              disabled={subSaving || !subForm.userId || !subForm.planId || !subForm.startDate}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {subSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {subSaving ? 'جاري الحفظ...' : (editSub ? 'تحديث الاشتراك' : 'إنشاء الاشتراك')}
            </button>
            <button
              onClick={() => setSubDialogOpen(false)}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-16" /><Footer />
    </motion.div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

export default function Page() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-white text-gray-800">
        <Header />
        <AuthModal />
        <AnimatePresence mode="wait">
          <ViewRouter />
        </AnimatePresence>
      </div>
    </AppProvider>
  );
}

function ViewRouter() {
  const { currentView } = useApp();
  switch (currentView) {
    case 'home': return <HomeView />;
    case 'explore': return <ExploreView />;
    case 'restaurant': return <RestaurantProfileView />;
    case 'feed': return <FeedView />;
    case 'menu': return <MenuView />;
    case 'cart': return <CartView />;
    case 'about': return <AboutView />;
    case 'dashboard': return <DashboardView />;
    case 'admin': return <AdminView />;
    case 'plans': return <PlansView />;
    default: return <HomeView />;
  }
}
